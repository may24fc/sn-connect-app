import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '../client';

const APPLICATION_RESUMES_BUCKET = 'application-resumes';

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

    const markdown = await step.run('extract-text', async () => {
      const buffer = Buffer.from(fileData.buffer, 'base64');

      let text: string;

      if (fileData.ext === 'pdf') {
        const pdf = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await pdf.getText();
        text = result.text;
        await pdf.destroy();
      } else if (fileData.ext === 'docx' || fileData.ext === 'doc') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        // Fallback: treat as plain text
        text = buffer.toString('utf-8');
      }

      // Clean up: collapse excessive whitespace, trim
      return text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    });

    if (!markdown || markdown.length < 20) {
      return { status: 'skipped', reason: 'Resume text too short or empty' };
    }

    // Truncate extremely long resumes to avoid context window issues
    const MAX_RESUME_LENGTH = 30_000;
    const truncated =
      markdown.length > MAX_RESUME_LENGTH
        ? `${markdown.slice(0, MAX_RESUME_LENGTH)}\n\n[Resume truncated — ${markdown.length} characters total]`
        : markdown;

    await step.run('save-parsed-text', async () => {
      const supabase = createSupabaseAdminClient();

      const { error } = await supabase
        .from('job_applications')
        .update({
          parsed_resume_markdown: truncated,
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

    return {
      status: 'parsed',
      applicationId,
      characters: truncated.length,
    };
  },
);
