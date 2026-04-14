import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isJobAdmin } from '../../../jobs/_lib';
import { inngest } from '@/lib/inngest/client';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/[id]/evaluate
 *
 * Manually trigger (or re-trigger) AI evaluation for a single application.
 * If the application already has parsed_resume_markdown, fires ats/resume.parsed directly.
 * If it only has a cv_url/resume_url, fires ats/resume.upload to parse first.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, role, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, parsed_resume_markdown, cv_url, resume_url, job_posting_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!application.job_posting_id) {
      return NextResponse.json(
        { error: 'Application is not linked to a job posting' },
        { status: 400 },
      );
    }

    if (application.parsed_resume_markdown) {
      const { error: queueError } = await supabase
        .from('job_applications')
        .update({
          ai_evaluation_status: 'queued',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null);

      if (queueError) {
        console.error('Failed to mark application as queued for evaluation:', queueError);
        return NextResponse.json({ error: 'Failed to queue application for evaluation' }, { status: 500 });
      }

      // Resume already parsed — trigger evaluation directly
      await inngest.send({
        name: 'ats/resume.parsed',
        data: { applicationId: id },
      });

      return NextResponse.json({
        data: { status: 'evaluation_queued', applicationId: id },
      });
    }

    // Need to parse first
    const filePath = application.resume_url ?? application.cv_url;
    if (!filePath) {
      return NextResponse.json(
        { error: 'Application has no resume file to evaluate' },
        { status: 400 },
      );
    }

    const { error: queueError } = await supabase
      .from('job_applications')
      .update({
        ai_evaluation_status: 'queued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (queueError) {
      console.error('Failed to mark application as queued for parsing:', queueError);
      return NextResponse.json({ error: 'Failed to queue application for parsing' }, { status: 500 });
    }

    await inngest.send({
      name: 'ats/resume.upload',
      data: { applicationId: id, filePath },
    });

    return NextResponse.json({
      data: { status: 'parse_and_evaluation_queued', applicationId: id },
    });
  } catch (err) {
    console.error('Error in POST /api/applications/[id]/evaluate:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
