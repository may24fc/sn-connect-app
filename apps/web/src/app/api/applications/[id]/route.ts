import { type NextRequest, NextResponse } from 'next/server';
import { updateApplicationStatusSchema } from '@/lib/schemas/job.schema';
import { sendApplicationStatusUpdate } from '@/lib/email';
import { getAuthedSupabase, isJobAdmin } from '../../jobs/_lib';

function normalizeApplication<T extends Record<string, unknown>>(row: T) {
  const jobPosting =
    typeof row.job_postings === 'object' && row.job_postings !== null
      ? (row.job_postings as Record<string, unknown>)
      : null;
  const requisitions = Array.isArray(jobPosting?.job_requisitions)
    ? jobPosting.job_requisitions
    : [];
  const jobRequisition = requisitions.find(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && item.deleted_at == null
  ) ?? null;

  return {
    ...row,
    job_postings: jobPosting
      ? {
          ...jobPosting,
          job_requisition: jobRequisition,
        }
      : null,
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
      .from('job_applications')
      .select('*, job_postings(id, title, department, location, employment_type, is_active, closes_at, job_requisitions(*))')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ data: normalizeApplication(data as Record<string, unknown>) });
  } catch (error) {
    console.error('Error in GET /api/applications/[id]:', error);
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
    const parsed = updateApplicationStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus, notes } = parsed.data;

    if (newStatus === 'hired') {
      return NextResponse.json(
        { error: 'Use the dedicated hire action to mark an application as hired' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data, error: updateError } = await supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*, job_postings(id, title, department, location, employment_type, is_active, closes_at, job_requisitions(*))')
      .single();

    if (updateError || !data) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Send status update email to the applicant (non-blocking)
    const jobTitle = (data as Record<string, unknown> & { job_postings?: { title?: string } }).job_postings?.title ?? 'the position you applied for';
    sendApplicationStatusUpdate({
      to: data.email as string,
      applicantName: data.full_name as string,
      positionTitle: jobTitle,
      status: newStatus,
    }).catch((err) => {
      console.error('[Email] Unhandled error sending status update:', err);
    });

    return NextResponse.json({ data: normalizeApplication(data as Record<string, unknown>) });
  } catch (error) {
    console.error('Error in PATCH /api/applications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
