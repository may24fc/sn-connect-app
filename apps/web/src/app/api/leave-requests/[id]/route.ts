import { type NextRequest, NextResponse } from 'next/server';
import { getLeaveAuthedContext, isAdminRole } from '../_lib';

// PATCH /api/leave-requests/[id] — update a leave request (cancel own / approve/reject for admins)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await getLeaveAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role } = auth.context;
    const { id } = await params;
    const body = await request.json();

    // Fetch the leave request first
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const isAdmin = isAdminRole(role);
    const isOwner = existing.user_id === user.id;

    // Owner can only cancel their own pending requests
    if (isOwner && !isAdmin) {
      if (body.status !== 'cancelled') {
        return NextResponse.json({ error: 'You can only cancel your own leave requests' }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 422 });
      }
    }

    // Non-owner, non-admin cannot modify
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};

    if (body.status) {
      const validStatuses = isAdmin
        ? ['approved', 'rejected', 'cancelled']
        : ['cancelled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status transition` }, { status: 422 });
      }
      updatePayload.status = body.status;
    }

    if (isAdmin && (body.status === 'approved' || body.status === 'rejected')) {
      updatePayload.reviewer_id = user.id;
      updatePayload.reviewed_at = new Date().toISOString();
      if (body.reviewer_notes) {
        updatePayload.reviewer_notes = String(body.reviewer_notes).trim();
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 422 });
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[leave-requests] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[leave-requests] PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
