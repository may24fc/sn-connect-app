import { type NextRequest, NextResponse } from 'next/server';
import { updateJobPostingSchema } from '@/lib/schemas/job.schema';
import { getAuthedSupabase, isJobAdmin } from '../_lib';

function normalizeJobPosting<T extends Record<string, unknown>>(row: T) {
  const requisitions = Array.isArray(row.job_requisitions) ? row.job_requisitions : [];
  const jobRequisition = requisitions.find(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && item.deleted_at == null
  ) ?? null;

  return {
    ...row,
    job_requisition: jobRequisition,
  };
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: fetchError } = await supabase
      .from('job_postings')
      .select('*, job_requisitions(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Job posting not found' }, { status: 404 });
    }

    return NextResponse.json({ data: normalizeJobPosting(data as Record<string, unknown>) });
  } catch (error) {
    console.error('Error in GET /api/jobs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateJobPostingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data: existingJob, error: existingJobError } = await supabase
      .from('job_postings')
      .select('*, job_requisitions(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (existingJobError || !existingJob) {
      return NextResponse.json({ error: 'Job posting not found' }, { status: 404 });
    }

    const normalizedExistingJob = normalizeJobPosting(existingJob as Record<string, unknown>) as Record<
      string,
      unknown
    > & { job_requisition?: Record<string, unknown> | null };

    const { total_headcount, ...jobPostingPayload } = payload;
    const currentFilledHeadcount =
      typeof normalizedExistingJob.job_requisition?.filled_headcount === 'number'
        ? normalizedExistingJob.job_requisition.filled_headcount
        : 0;
    const nextRequisitionStatus =
      typeof total_headcount === 'number' && currentFilledHeadcount >= total_headcount
        ? 'filled'
        : 'open';

    const { data, error: updateError } = await supabase
      .from('job_postings')
      .update({
        ...jobPostingPayload,
        ...(typeof total_headcount === 'number' && nextRequisitionStatus === 'filled'
          ? {
              is_active: false,
              closes_at:
                normalizedExistingJob.closes_at ?? new Date().toISOString(),
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('Error updating job posting:', updateError);
      return NextResponse.json({ error: 'Failed to update job posting' }, { status: 500 });
    }

    let jobRequisition = normalizedExistingJob.job_requisition ?? null;

    if (jobRequisition && typeof total_headcount === 'number') {
      const { data: updatedRequisition, error: requisitionError } = await supabase
        .from('job_requisitions')
        .update({
          total_headcount,
          status: nextRequisitionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobRequisition.id)
        .select('*')
        .single();

      if (requisitionError || !updatedRequisition) {
        console.error('Error updating job requisition:', requisitionError);
        return NextResponse.json({ error: 'Failed to update job requisition' }, { status: 500 });
      }

      jobRequisition = updatedRequisition as Record<string, unknown>;
    }

    return NextResponse.json({ data: { ...data, job_requisition: jobRequisition } });
  } catch (error) {
    console.error('Error in PATCH /api/jobs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('job_postings')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (deleteError) {
      console.error('Error archiving job posting:', deleteError);
      return NextResponse.json({ error: 'Failed to archive job posting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/jobs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
