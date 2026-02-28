import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * PATCH /api/profile-change-requests/[id]
 * Approve or reject a profile change request
 * Body: { action: 'approve' | 'reject', review_note?: string }
 * Only admin/super_admin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, review_note } = body as {
      action: 'approve' | 'reject';
      review_note?: string;
    };

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch the change request
    const { data: changeRequest, error: fetchError } = await supabase
      .from('profile_change_requests')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Change request has already been processed' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the change request status
    const { data: updated, error: updateError } = await supabase
      .from('profile_change_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: review_note || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating change request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update change request' },
        { status: 500 }
      );
    }

    // If approved, apply the changes to the employees table
    if (action === 'approve') {
      const changes = changeRequest.changes as Record<
        string,
        { old: string | null; new: string | null }
      >;

      const updatePayload: Record<string, string | null> = {};
      for (const [field, value] of Object.entries(changes)) {
        updatePayload[field] = value.new;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: empUpdateError } = await supabase
          .from('employees')
          .update(updatePayload)
          .eq('id', changeRequest.employee_id);

        if (empUpdateError) {
          console.error('Error applying changes to employee:', empUpdateError);
          // Rollback the approval
          await supabase
            .from('profile_change_requests')
            .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
            .eq('id', id);

          return NextResponse.json(
            { error: 'Failed to apply changes to employee record' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('Error in PATCH /api/profile-change-requests/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
