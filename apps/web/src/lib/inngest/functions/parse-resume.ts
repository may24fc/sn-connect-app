import { createRequire } from 'node:module';
import { getLangWatchTracer } from 'langwatch/observability';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  claimApplicationEvaluationStatus,
  getApplicationEvaluationStatus,
  updateApplicationEvaluationStatus,
} from '@/lib/ats/evaluation';
import { inngest } from '../client';

const require = createRequire(import.meta.url);

const APPLICATION_RESUMES_BUCKET = 'applications';
const ALLOWED_RESUME_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

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
    const atsTracer = getLangWatchTracer('sn-connect-ai-ats');

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
        const parseClaim = await step.run('claim-parse-work', async () => {
          const claimed = await claimApplicationEvaluationStatus(
            applicationId,
            'parsing',
            ['idle', 'queued', 'failed'],
          );

          if (claimed) {
            return { claimed: true, status: 'parsing' };
          }

          const currentStatus = await getApplicationEvaluationStatus(applicationId);
          return { claimed: false, status: currentStatus };
        });

        if (!parseClaim.claimed) {
          const result = {
            status: 'ignored',
            reason: `Resume parse already handled with status ${parseClaim.status ?? 'unknown'}`,
            applicationId,
          };

          workflowSpan.setOutput('json', result);
          return result;
        }

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
          const contentType = data.type?.toLowerCase() ?? null;

          if (!ALLOWED_RESUME_EXTENSIONS.has(ext)) {
            throw new Error(`Unsupported resume extension: ${ext || 'unknown'}`);
          }

          if (contentType && !ALLOWED_RESUME_MIME_TYPES.has(contentType)) {
            throw new Error(`Unsupported resume content type: ${contentType}`);
          }

          return { buffer: buffer.toString('base64'), ext, contentType };
        });

        const markdown = await atsTracer.withActiveSpan('ats-resume-text-extraction', async (extractSpan) => {
          extractSpan.setType('tool');
          extractSpan.setInput('json', {
            applicationId,
            fileExtension: fileData.ext,
            contentType: fileData.contentType,
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
              const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse');
              const pdf = new PDFParse({ data: new Uint8Array(buffer) });
              const result = await pdf.getText();
              extractedText = result.text;
              await pdf.destroy();
            } else if (fileData.ext === 'docx' || fileData.ext === 'doc') {
              const mammoth = await import('mammoth');
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
          await step.run('mark-parse-too-short', async () => {
            await updateApplicationEvaluationStatus(applicationId, 'failed');
          });

          workflowSpan.setOutput('json', {
            status: 'failed',
            reason: 'Resume text too short or empty',
          });
          return { status: 'failed', reason: 'Resume text too short or empty' };
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
              ai_evaluation_status: 'queued',
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId)
            .is('deleted_at', null);

          if (error) {
            throw new Error(`Failed to save parsed resume: ${error.message}`);
          }
        });

        // For bulk-imported rows with placeholder emails, extract real
        // name and email from the parsed resume text.
        await step.run('extract-contact-info', async () => {
          const supabase = createSupabaseAdminClient();

          const { data: app } = await supabase
            .from('job_applications')
            .select('email, full_name')
            .eq('id', applicationId)
            .single();

          if (!app) return;

          const isPlaceholder = app.email?.endsWith('@placeholder.local');
          if (!isPlaceholder) return;

          const updates: Record<string, string> = {};

          // Extract email from resume text
          const emailMatch = truncated.match(
            /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/,
          );
          if (emailMatch) {
            const extracted = emailMatch[0].toLowerCase();
            // Skip obviously fake/example emails
            if (
              !extracted.endsWith('@example.com') &&
              !extracted.endsWith('@placeholder.local')
            ) {
              updates.email = extracted;
            }
          }

          // Extract name: first non-empty line that looks like a name
          // (no digits, no @, 2-5 words, under 60 chars)
          const lines = truncated.split('\n').map((l) => l.trim()).filter(Boolean);
          for (const line of lines.slice(0, 10)) {
            const clean = line.replace(/^#+\s*/, '').trim();
            if (
              clean.length >= 3 &&
              clean.length <= 60 &&
              !/\d/.test(clean) &&
              !clean.includes('@') &&
              !clean.includes('http') &&
              !clean.includes(':') &&
              clean.split(/\s+/).length >= 2 &&
              clean.split(/\s+/).length <= 5
            ) {
              updates.full_name = clean;
              break;
            }
          }

          if (Object.keys(updates).length === 0) return;

          updates.updated_at = new Date().toISOString();

          await supabase
            .from('job_applications')
            .update(updates)
            .eq('id', applicationId)
            .is('deleted_at', null);
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
