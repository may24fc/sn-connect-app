import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const TASK_ASSIGNER_ROLE = 'super_admin';
export const TASK_ASSIGNABLE_ROLES = ['employee', 'intern'] as const;

type TaskAssignableRole = (typeof TASK_ASSIGNABLE_ROLES)[number];

export interface TaskAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
}

export async function getTaskAuthedContext(): Promise<
  { ok: true; context: TaskAuthedContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  let role: string | null =
    typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { ok: false, status: 500, error: 'Failed to resolve user role' };
    }

    role = roleData?.role ?? null;
  }

  return {
    ok: true,
    context: {
      supabase,
      supabaseAdmin,
      user,
      role,
    },
  };
}

export async function validateTaskAssignee(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  assigneeId: string
): Promise<{ ok: true; role: TaskAssignableRole } | { ok: false; status: number; error: string }> {
  const { data: assignee, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', assigneeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Failed to validate assignee account' };
  }

  if (!assignee) {
    return { ok: false, status: 400, error: 'Assigned user was not found' };
  }

  if (!TASK_ASSIGNABLE_ROLES.includes(assignee.role as TaskAssignableRole)) {
    return {
      ok: false,
      status: 400,
      error: 'Tasks can only be assigned to employee or intern accounts',
    };
  }

  return { ok: true, role: assignee.role as TaskAssignableRole };
}

export function getTaskWriteErrorMessage(
  error: { code?: string; message?: string } | null
): string {
  if (!error) {
    return 'Task operation failed';
  }

  if (error.code === '23503') {
    return 'Referenced assignment user does not exist';
  }

  if (error.code === '23505') {
    return 'A conflicting task record already exists';
  }

  return error.message || 'Task operation failed';
}
