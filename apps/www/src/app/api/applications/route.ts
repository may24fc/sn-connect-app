import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendApplicationConfirmation } from '@/lib/email';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const applicationBodySchema = z.object({
  full_name: z.string().min(2).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(30).optional(),
  job_posting_id: z.string().min(1, { message: 'Job posting ID is required' }),
  cover_letter: z.string().max(10000).optional(),
});

/**
 * GET /api/applications
 * Returns a map of { [job_posting_id]: count } for displaying applicant counts publicly.
 * Uses the admin client so RLS does not block the aggregate read.
 */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('job_applications')
      .select('job_posting_id');

    if (error) {
      console.error('Applicant count fetch error:', error.message);
      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id: string = row.job_posting_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }

    return NextResponse.json({ counts }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    let data: Record<string, string>;
    let resumeFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = {
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || '',
        job_posting_id: formData.get('job_posting_id') as string,
        cover_letter: (formData.get('cover_letter') as string) || '',
      };
      const file = formData.get('resume');
      if (file instanceof File && file.size > 0) {
        resumeFile = file;
      }
    } else {
      data = await request.json();
    }

    const parsed = applicationBodySchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Validate file
    let resumeUrl: string | null = null;
    const supabase = createSupabaseAdminClient();

    if (resumeFile) {
      if (resumeFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
      }
      if (!ALLOWED_MIME_TYPES.includes(resumeFile.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: PDF, DOC, DOCX' },
          { status: 400 },
        );
      }

      const timestamp = Date.now();
      const sanitizedName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `resumes/${timestamp}_${sanitizedName}`;

      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(filePath, buffer, {
          contentType: resumeFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Resume upload error:', uploadError.message);
        return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 });
      }

      // Store the file path, not a public URL (bucket is private; signed URLs are generated on demand)
      resumeUrl = filePath;
    }

    // Insert application
    const { data: insertedApp, error: insertError } = await supabase.from('job_applications').insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      job_posting_id: parsed.data.job_posting_id,
      cover_letter: parsed.data.cover_letter ?? null,
      cv_url: resumeUrl ?? '',
      resume_url: resumeUrl,
    })
      .select('id')
      .single();

    if (insertError || !insertedApp) {
      console.error('Application insert error:', insertError?.message);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    // Trigger ATS AI evaluation if a resume was uploaded (non-blocking)
    if (resumeUrl) {
      const inngestEventKey = process.env.INNGEST_EVENT_KEY;
      const inngestBaseUrl = process.env.INNGEST_BASE_URL || 'https://inn.gs';
      if (inngestEventKey) {
        fetch(`${inngestBaseUrl}/e/${inngestEventKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'ats/resume.upload',
            data: {
              applicationId: insertedApp.id,
              filePath: resumeUrl,
            },
          }),
        }).catch((err) => {
          console.error('[ATS] Failed to send Inngest event for public application:', err);
        });
      }
    }

    // Send confirmation email (non-blocking — failure won't affect the response)
    let positionTitle = 'the position you applied for';
    const { data: jobData } = await supabase
      .from('job_postings')
      .select('title')
      .eq('id', parsed.data.job_posting_id)
      .single();
    if (jobData?.title) {
      positionTitle = jobData.title;
    }

    await sendApplicationConfirmation({
      to: parsed.data.email,
      applicantName: parsed.data.full_name,
      positionTitle,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
