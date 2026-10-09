import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const MANAGEABLE_DIRECTORY_ROLES = ['employee', 'associate', 'admin', 'super_admin'] as const;

// Free-text comment (e.g. "Resigned", "AWOL"). Blank clears it.
const terminationReasonSchema = z.string().trim().max(500, 'Comment must be 500 characters or fewer');

const patchUserSchema = z.union([
  z.object({ status: z.enum(['inactive', 'active']) }).strict(),
  z
    .object({
      date_terminated: z.string().date().optional(),
      termination_reason: terminationReasonSchema.nullable().optional(),
    })
    .strict()
    .refine(
      (value) => value.date_terminated !== undefined || value.termination_reason !== undefined,
      { message: 'Provide a termination date or comment' }
    ),
]);

const terminateBodySchema = z
  .object({ termination_reason: terminationReasonSchema.nullable().optional() })
  .strict();

function normalizeTerminationReason(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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
 * Deactivate (status=inactive) or restore (status=active) a directory account,
 * or correct the termination date (date_terminated=YYYY-MM-DD) and/or comment
 * (termination_reason, max 500 chars, blank clears it) of a terminated one.
 * Restoring also clears date_terminated and termination_reason on the employee record.
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

    const body = parsedBody.data;

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
        { error: 'Only directory employee, associate, admin, or super-admin accounts can be modified here' },
        { status: 403 }
      );
    }

    if (!('status' in body)) {
      if (targetUser.status !== 'terminated') {
        return NextResponse.json(
          { error: 'Termination details can only be edited for terminated accounts' },
          { status: 409 }
        );
      }

      const { data: employee, error: employeeError } = await adminClient
        .from('employees')
        .select('id, date_hired, date_terminated, termination_reason')
        .eq('user_id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (employeeError) {
        console.error('Error loading employee for termination update:', employeeError);
        return NextResponse.json({ error: 'Failed to update termination details' }, { status: 500 });
      }

      if (!employee) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
      }

      const updates: { date_terminated?: string; termination_reason?: string | null } = {};

      if (body.date_terminated !== undefined) {
        if (body.date_terminated > new Date().toISOString().slice(0, 10)) {
          return NextResponse.json(
            { error: 'Termination date cannot be in the future' },
            { status: 400 }
          );
        }

        if (employee.date_hired && body.date_terminated < employee.date_hired.slice(0, 10)) {
          return NextResponse.json(
            { error: 'Termination date cannot be before the start date' },
            { status: 400 }
          );
        }

        // Midday UTC keeps the calendar day stable when rendered in any timezone.
        updates.date_terminated = `${body.date_terminated}T12:00:00.000Z`;
      }

      if (body.termination_reason !== undefined) {
        updates.termination_reason = normalizeTerminationReason(body.termination_reason);
      }

      const { error: updateDetailsError } = await adminClient
        .from('employees')
        .update(updates)
        .eq('id', employee.id);

      if (updateDetailsError) {
        console.error('Error updating termination details:', updateDetailsError);
        return NextResponse.json({ error: 'Failed to update termination details' }, { status: 500 });
      }

      // The comment can be sensitive HR text, so the audit entry records only that it changed.
      logActivity(supabase, {
        userId: user.id,
        action: 'update_termination_details',
        tableName: 'employees',
        recordId: employee.id,
        metadata: {
          date_changed: updates.date_terminated !== undefined,
          previous_date_terminated: employee.date_terminated,
          date_terminated: updates.date_terminated ?? employee.date_terminated,
          reason_changed:
            updates.termination_reason !== undefined &&
            updates.termination_reason !== employee.termination_reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          date_terminated: updates.date_terminated ?? employee.date_terminated,
          termination_reason:
            updates.termination_reason !== undefined
              ? updates.termination_reason
              : employee.termination_reason,
        },
      });
    }

    const newStatus = body.status;

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

    // When restoring a terminated employee/associate, clear the termination date and comment
    // and re-activate the latest terminated internship (if no active one exists).
    if (newStatus === 'active') {
      const { data: restoredEmployee } = await adminClient
        .from('employees')
        .update({ date_terminated: null, termination_reason: null })
        .eq('user_id', id)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();

      if (targetUser.role === 'associate' && restoredEmployee?.id) {
        const { data: activeInternship } = await adminClient
          .from('internships')
          .select('id')
          .eq('employee_id', restoredEmployee.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (!activeInternship) {
          const { data: latestTerminatedInternship } = await adminClient
            .from('internships')
            .select('id')
            .eq('employee_id', restoredEmployee.id)
            .eq('status', 'terminated')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestTerminatedInternship?.id) {
            await adminClient
              .from('internships')
              .update({ status: 'active', updated_at: new Date().toISOString() })
              .eq('id', latestTerminatedInternship.id);
          }
        }
      }
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
 * Terminate a directory account. The body is optional: { termination_reason?: string }.
 * Sets users.status = 'terminated' and records employees.date_terminated and, when given,
 * the termination comment.
 * Records are preserved in the directory (visible in the Former Employees tab).
 * Permissions: Admin and Super Admin only
 */
export async function DELETE(
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

    // The body is optional: a bare DELETE (no content) terminates without a comment.
    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = terminateBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }
    const terminationReason = normalizeTerminationReason(parsedBody.data.termination_reason);

    const adminClient = createSupabaseAdminClient();
    const targetUser = await getManagedTargetUser(id, adminClient);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isManageableDirectoryRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only directory employee, associate, admin, or super-admin accounts can be terminated here' },
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
      .update({ date_terminated: terminatedAt, termination_reason: terminationReason })
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
      metadata: { date_terminated: terminatedAt, has_reason: terminationReason !== null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
