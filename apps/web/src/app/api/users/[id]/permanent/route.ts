import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const MANAGEABLE_DIRECTORY_ROLES = ['employee', 'associate', 'admin', 'super_admin'] as const;

// ~100 years: effectively permanent without relying on a provider-specific "forever" value.
const PERMANENT_BAN_DURATION = '876000h';

/**
 * DELETE /api/users/[id]/permanent
 * Permanently delete a terminated directory account, whatever records are linked to it.
 * 1. Disables the login: bans the auth user and replaces its email with a placeholder,
 *    which also frees the real address for a future invite.
 * 2. Calls public.purge_directory_user: deletes personal data, keeps shared work (tickets,
 *    invoices, payments, expenses, reports, tasks, projects, announcements) attributed by
 *    name, hides the name-only stub from the directory, and strips audit-log snapshots.
 * Irreversible. Only terminated accounts qualify; active accounts must be terminated first.
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
      .is('deleted_at', null)
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

    // Login goes first: if the purge then fails, the account is locked but intact, and the
    // request can simply be retried (both steps are idempotent).
    const { error: loginDisableError } = await adminClient.auth.admin.updateUserById(id, {
      email: `deleted-${id}@deleted.invalid`,
      email_confirm: true,
      ban_duration: PERMANENT_BAN_DURATION,
      user_metadata: {},
    });

    if (loginDisableError) {
      console.error('Error disabling login before permanent delete:', loginDisableError.message);
      return NextResponse.json({ error: 'Failed to disable the account login. Nothing was deleted.' }, { status: 500 });
    }

    const { error: purgeError } = await adminClient.rpc('purge_directory_user', { p_user_id: id });

    if (purgeError) {
      console.error('Error purging directory user:', purgeError.code, purgeError.message);
      return NextResponse.json(
        {
          error:
            'The login was disabled, but deleting the account data failed. No data was removed; try again.',
        },
        { status: 500 }
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
