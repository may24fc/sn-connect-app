import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const MANAGEABLE_DIRECTORY_ROLES = ['employee', 'associate', 'admin', 'super_admin'] as const;

/**
 * DELETE /api/users/[id]/permanent
 * Permanently remove a terminated directory account (auth user and cascaded profile rows).
 * Irreversible. Only terminated accounts can be removed; active accounts must be terminated first.
 * Accounts that still own records referenced without ON DELETE CASCADE are rejected by the
 * database and left untouched (the whole delete rolls back).
 * Permissions: Admin and Super Admin; deleting an admin or super-admin account requires Super Admin.
 */
export async function DELETE(
  _request: NextRequest,
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

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (requesterError || !requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (requester.role !== 'admin' && requester.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();
    const { data: target, error: targetError } = await adminClient
      .from('users')
      .select('id, role, status')
      .eq('id', id)
      .maybeSingle();

    if (targetError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!MANAGEABLE_DIRECTORY_ROLES.includes(target.role as (typeof MANAGEABLE_DIRECTORY_ROLES)[number])) {
      return NextResponse.json(
        { error: 'Only directory employee, associate, admin, or super-admin accounts can be deleted here' },
        { status: 403 }
      );
    }

    if ((target.role === 'admin' || target.role === 'super_admin') && requester.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only a super admin can permanently delete an admin account' },
        { status: 403 }
      );
    }

    if (target.status !== 'terminated') {
      return NextResponse.json(
        { error: 'Only terminated accounts can be permanently deleted' },
        { status: 409 }
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error('Error permanently deleting user:', deleteError);
      return NextResponse.json(
        {
          error:
            'This account still has linked records (e.g. tasks, reports or reviews) and cannot be permanently deleted. It remains in Former Employees.',
        },
        { status: 409 }
      );
    }

    // Identifiers only: no PII is recorded for the removed account.
    logActivity(supabase, {
      userId: user.id,
      action: 'permanently_delete_user',
      tableName: 'users',
      recordId: id,
      metadata: { role: target.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]/permanent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
