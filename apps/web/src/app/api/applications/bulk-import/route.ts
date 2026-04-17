import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAuthedSupabase, isJobAdmin } from '../../jobs/_lib';
import { inngest } from '@/lib/inngest/client';

export const runtime = 'nodejs';

const MAX_FILES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);
const APPLICATION_RESUMES_BUCKET = 'applications';
const FILENAME_NOISE_TOKENS = new Set([
  'resume',
  'cv',
  'curriculum',
  'vitae',
  'final',
  'latest',
  'updated',
  'update',
  'draft',
  'copy',
]);

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * Extract a display name from a filename.
 * e.g. "John_Doe_Resume.pdf" → "John Doe Resume"
 */
function nameFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');

  const cleanedTokens = withoutExt
    .replace(/[()\[\]{}]+/g, ' ')
    .replace(/[._-]+/g, ' ')
    // Split camelCase / PascalCase boundaries: "ResumeArabellaAndrada" → "Resume Arabella Andrada"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\b\d{4}(?:\d{2})?(?:\d{2})?\b/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !FILENAME_NOISE_TOKENS.has(token.toLowerCase()));

  if (cleanedTokens.length === 0) {
    return 'Imported Applicant';
  }

  return cleanedTokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const jobPostingId = formData.get('job_posting_id') as string | null;

    if (!jobPostingId) {
      return NextResponse.json(
        { error: 'job_posting_id is required' },
        { status: 400 },
      );
    }

    // Validate the job posting exists
    const { data: posting, error: postingError } = await supabase
      .from('job_postings')
      .select('id, title')
      .eq('id', jobPostingId)
      .is('deleted_at', null)
      .single();

    if (postingError || !posting) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 },
      );
    }

    // Collect files from formData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per import` },
        { status: 400 },
      );
    }

    // Validate each file before processing
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 },
        );
      }
      const ext = getExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `File "${file.name}" is not a supported format. Use PDF or DOCX.` },
          { status: 400 },
        );
      }
    }

    const adminClient = createSupabaseAdminClient();
    const results: Array<{ applicationId: string; fileName: string; status: string }> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const ext = getExtension(file.name);
        const storagePath = `${jobPostingId}/${crypto.randomUUID()}${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Supabase Storage
        const { error: uploadError } = await adminClient.storage
          .from(APPLICATION_RESUMES_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          errors.push({ fileName: file.name, error: `Upload failed: ${uploadError.message}` });
          continue;
        }

        // Create application row
        const { data: application, error: insertError } = await adminClient
          .from('job_applications')
          .insert({
            job_posting_id: jobPostingId,
            full_name: nameFromFilename(file.name),
            email: `imported-${crypto.randomUUID().slice(0, 8)}@placeholder.local`,
            cv_url: storagePath,
            resume_url: storagePath,
            status: 'pending',
            ai_evaluation_status: 'queued',
          })
          .select('id')
          .single();

        if (insertError || !application) {
          errors.push({ fileName: file.name, error: `Insert failed: ${insertError?.message}` });
          continue;
        }

        // Fire Inngest event for parsing
        await inngest.send({
          name: 'ats/resume.upload',
          data: {
            applicationId: application.id,
            filePath: storagePath,
          },
        });

        results.push({
          applicationId: application.id,
          fileName: file.name,
          status: 'queued',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ fileName: file.name, error: message });
      }
    }

    // Audit log the bulk import
    await adminClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ats_bulk_import',
        table_name: 'job_applications',
        metadata: {
          jobPostingId,
          jobTitle: posting.title,
          totalFiles: files.length,
          successCount: results.length,
          errorCount: errors.length,
        },
      })
      .then(({ error }) => {
        if (error) console.error('[Audit] Failed to log bulk import:', error);
      });

    return NextResponse.json({
      data: {
        imported: results,
        errors,
        summary: {
          total: files.length,
          queued: results.length,
          failed: errors.length,
        },
      },
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/applications/bulk-import:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
