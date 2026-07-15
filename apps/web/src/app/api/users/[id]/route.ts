import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const MANAGEABLE_DIRECTORY_ROLES = ['employee', 'associate'] as const;

const patchUserSchema = z.object({
  status: z.enum(['inactive', 'active']),
});

function isManageableDirectoryRole(role: string): boolean {
  return MANAGEABLE_DIRECTORY_ROLES.includes(role as (typeof MANAGEABLE_DIRECTORY_ROLES)[number]);
}

async function getRequesterRole(
  userId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<string | null> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError || !userData) {
    return null;
  }

  return userData.role;
}

async function getManagedTargetUser(
  userId: string,
  adminClient: ReturnType<typeof createSupabaseAdminClient>
): Promise<{ deleted_at: string | null; id: string; role: string; status: string } | null> {
  const { data, error } = await adminClient
    .from('users')
    .select('id, role, status, deleted_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || data.deleted_at) {
    return null;
  }

  return data;
}

/**
 * PATCH /api/users/[id]
 * Deactivate (status=inactive) or restore (status=active) an employee/associate account.
 * Restoring also clears the date_terminated field on the linked employee record.
 * Permissions: Admin and Super Admin only
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

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    const parsedBody = patchUserSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus } = parsedBody.data;

    const requesterRole = await getRequesterRole(user.id, supabase);
    if (!requesterRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!ADMIN_ROLES.includes(requesterRole as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();
    const targetUser = await getManagedTargetUser(id, adminClient);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isManageableDirectoryRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee and associate accounts can be modified here' },
        { status: 403 }
      );
    }

    // Idempotency: already in the target state
    if (targetUser.status === newStatus) {
      return NextResponse.json({ success: true, data: targetUser });
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ status: newStatus })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, role, status')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    // When restoring a terminated employee, clear the termination date
    if (newStatus === 'active') {
      await adminClient
        .from('employees')
        .update({ date_terminated: null })
        .eq('user_id', id)
        .is('deleted_at', null);
    }

    const auditAction = newStatus === 'active' ? 'restore_user' : 'deactivate_user';
    logActivity(supabase, {
      userId: user.id,
      action: auditAction,
      tableName: 'users',
      recordId: id,
      metadata: { status: newStatus },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Terminate an employee or associate account.
 * Sets users.status = 'terminated' and records employees.date_terminated.
 * Records are preserved in the directory (visible in the Former Employees tab).
 * Permissions: Admin and Super Admin only
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

    const requesterRole = await getRequesterRole(user.id, supabase);
    if (!requesterRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!ADMIN_ROLES.includes(requesterRole as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot terminate your own account' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const targetUser = await getManagedTargetUser(id, adminClient);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isManageableDirectoryRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee and associate accounts can be terminated here' },
        { status: 403 }
      );
    }

    // Idempotency: already terminated
    if (targetUser.status === 'terminated') {
      return NextResponse.json({ success: true });
    }

    const terminatedAt = new Date().toISOString();

    const { error: terminateError } = await adminClient
      .from('users')
      .update({ status: 'terminated' })
      .eq('id', id)
      .is('deleted_at', null);

    if (terminateError) {
      console.error('Error terminating user:', terminateError);
      return NextResponse.json({ error: 'Failed to terminate user' }, { status: 500 });
    }

    // Update employee termination date and get the employee id to cascade to internships
    const { data: employeeData } = await adminClient
      .from('employees')
      .update({ date_terminated: terminatedAt })
      .eq('user_id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    // If this user had an active internship, terminate it too.
    // The internship table has no direct user_id; the chain is:
    //   users.id → employees.user_id → employees.id → internships.employee_id
    if (employeeData?.id) {
      await adminClient
        .from('internships')
        .update({ status: 'terminated', updated_at: terminatedAt })
        .eq('employee_id', employeeData.id)
        .eq('status', 'active');
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'terminate_user',
      tableName: 'users',
      recordId: id,
      metadata: { date_terminated: terminatedAt },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
