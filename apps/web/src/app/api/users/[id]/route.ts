import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const MANAGEABLE_DIRECTORY_ROLES = ['employee', 'intern'] as const;

const deactivateUserSchema = z.object({
  status: z.literal('inactive'),
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
 * Deactivate an employee or intern account by setting users.status = 'inactive'
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
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const parsedBody = deactivateUserSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

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
        { error: 'Only employee and intern accounts can be deactivated here' },
        { status: 403 }
      );
    }

    if (targetUser.status === 'inactive') {
      return NextResponse.json({ success: true, data: targetUser });
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ status: 'inactive' })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, role, status')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error deactivating user:', updateError);
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'deactivate_user',
      tableName: 'users',
      recordId: id,
      metadata: { status: 'inactive' },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Soft-delete an employee or intern account and any linked employee record
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
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const targetUser = await getManagedTargetUser(id, adminClient);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isManageableDirectoryRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee and intern accounts can be removed here' },
        { status: 403 }
      );
    }

    const deletedAt = new Date().toISOString();

    const { error: deleteError } = await adminClient
      .from('users')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error soft-deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
    }

    await adminClient
      .from('employees')
      .update({ deleted_at: deletedAt })
      .eq('user_id', id)
      .is('deleted_at', null);

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_user',
      tableName: 'users',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
