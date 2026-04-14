import { PDFParse } from 'pdf-parse';
import { getLangWatchTracer } from 'langwatch/observability';
import mammoth from 'mammoth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '../client';

const APPLICATION_RESUMES_BUCKET = 'applications';
const atsTracer = getLangWatchTracer('sn-connect-ai-ats');

async function updateApplicationEvaluationStatus(
  applicationId: string,
  status: 'parsing' | 'evaluating' | 'failed',
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('job_applications')
    .update({
      ai_evaluation_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to update ATS evaluation status: ${error.message}`);
  }
}

/**
 * Inngest function: Parse an uploaded resume (PDF/DOCX) to markdown.
 *
 * Triggered by `ats/resume.upload`.
 * Downloads the file from Supabase Storage, extracts text,
 * stores the markdown on the application row, and fires
 * `ats/resume.parsed` for AI evaluation.
 */
export const parseResume = inngest.createFunction(
  {
    id: 'ats-parse-resume',
    retries: 3,
    throttle: { limit: 10, period: '1m' },
  },
  { event: 'ats/resume.upload' },
  async ({ event, step }) => {
    const { applicationId, filePath } = event.data;
    const fileExtension = filePath.split('.').pop()?.toLowerCase() ?? 'unknown';

    return await atsTracer.withActiveSpan('ats-parse-resume', async (workflowSpan) => {
      workflowSpan.setType('workflow');
      workflowSpan.setInput('json', {
        applicationId,
        fileExtension,
        storageBucket: APPLICATION_RESUMES_BUCKET,
      });
      workflowSpan.setAttribute('ai.feature', 'ats');
      workflowSpan.setAttribute('ats.stage', 'parse');
      workflowSpan.setAttribute('ats.application.id', applicationId);
      workflowSpan.setAttribute('langwatch.thread.id', `ats:${applicationId}`);
      workflowSpan.setAttribute('langwatch.labels', ['ATS', 'Resume Parsing']);

      try {
        await step.run('mark-parsing', async () => {
          await updateApplicationEvaluationStatus(applicationId, 'parsing');
        });

        const fileData = await step.run('download-file', async () => {
          const supabase = createSupabaseAdminClient();

          const { data, error } = await supabase.storage
            .from(APPLICATION_RESUMES_BUCKET)
            .download(filePath);

          if (error || !data) {
            throw new Error(`Failed to download resume: ${error?.message ?? 'No data'}`);
          }

          const buffer = Buffer.from(await data.arrayBuffer());
          const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

          return { buffer: buffer.toString('base64'), ext };
        });

        const markdown = await atsTracer.withActiveSpan('ats-resume-text-extraction', async (extractSpan) => {
          extractSpan.setType('tool');
          extractSpan.setInput('json', {
            applicationId,
            fileExtension: fileData.ext,
            encodedSizeBytes: Buffer.byteLength(fileData.buffer, 'base64'),
          });
          extractSpan.setAttribute('ai.feature', 'ats');
          extractSpan.setAttribute('ats.stage', 'extract');
          extractSpan.setAttribute('ats.application.id', applicationId);
          extractSpan.setAttribute('langwatch.thread.id', `ats:${applicationId}`);
          extractSpan.setAttribute('langwatch.labels', ['ATS', 'Resume Extraction']);

          const text = await step.run('extract-text', async () => {
            const buffer = Buffer.from(fileData.buffer, 'base64');

            let extractedText: string;

            if (fileData.ext === 'pdf') {
              const pdf = new PDFParse({ data: new Uint8Array(buffer) });
              const result = await pdf.getText();
              extractedText = result.text;
              await pdf.destroy();
            } else if (fileData.ext === 'docx' || fileData.ext === 'doc') {
              const result = await mammoth.extractRawText({ buffer });
              extractedText = result.value;
            } else {
              extractedText = buffer.toString('utf-8');
            }

            return extractedText
              .replace(/\r\n/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .replace(/[ \t]+/g, ' ')
              .trim();
          });

          extractSpan.setOutput('json', {
            extractedCharacters: text.length,
            extractedWords: text.split(/\s+/).filter(Boolean).length,
          });

          return text;
        });

        if (!markdown || markdown.length < 20) {
          workflowSpan.setOutput('json', {
            status: 'skipped',
            reason: 'Resume text too short or empty',
          });
          return { status: 'skipped', reason: 'Resume text too short or empty' };
        }

        const MAX_RESUME_LENGTH = 30_000;
        const wasTruncated = markdown.length > MAX_RESUME_LENGTH;
        const truncated =
          wasTruncated
            ? `${markdown.slice(0, MAX_RESUME_LENGTH)}\n\n[Resume truncated — ${markdown.length} characters total]`
            : markdown;

        await step.run('save-parsed-text', async () => {
          const supabase = createSupabaseAdminClient();

          const { error } = await supabase
            .from('job_applications')
            .update({
              parsed_resume_markdown: truncated,
              ai_evaluation_status: 'evaluating',
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId)
            .is('deleted_at', null);

          if (error) {
            throw new Error(`Failed to save parsed resume: ${error.message}`);
          }
        });

        await step.sendEvent('trigger-evaluation', {
          name: 'ats/resume.parsed',
          data: { applicationId },
        });

        const result = {
          status: 'parsed',
          applicationId,
          characters: truncated.length,
        };

        workflowSpan.setOutput('json', {
          ...result,
          originalCharacters: markdown.length,
          truncated: wasTruncated,
          fileExtension,
        });

        return result;
      } catch (error) {
        await step.run('mark-parse-failed', async () => {
          try {
            await updateApplicationEvaluationStatus(applicationId, 'failed');
          } catch (statusError) {
            console.error('Failed to mark parse status as failed:', statusError);
          }
        });
        workflowSpan.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    });
  },
);
