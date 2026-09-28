import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const TASK_ASSIGNER_ROLE = 'super_admin';
export const TASK_ASSIGNABLE_ROLES = ['employee', 'associate'] as const;

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
    .select('id, role, status')
    .eq('id', assigneeId)
    .is('deleted_at', null)
    .neq('status', 'terminated')
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
      error: 'Tasks can only be assigned to employee or associate accounts',
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

/** Roles that may read and comment on any task, mirroring the task_comments RLS policies. */
export const TASK_OVERSIGHT_ROLES = ['admin', 'hr', 'cos', 'ceo', TASK_ASSIGNER_ROLE] as const;

/**
 * Resolve whether the caller may view (and therefore comment on) a task.
 * Mirrors the task_comments RLS policy so the API can return an explicit
 * 404/403 instead of surfacing an empty list or an opaque write failure.
 */
export async function canAccessTask(
  context: TaskAuthedContext,
  taskId: string
): Promise<
  | { ok: true; task: { id: string; title: string; assigned_to: string | null; assigned_by: string } }
  | { ok: false; status: number; error: string }
> {
  const { supabaseAdmin, user, role } = context;

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, assigned_to, assigned_by')
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Failed to load task' };
  }

  if (!task) {
    return { ok: false, status: 404, error: 'Task not found' };
  }

  const isParticipant = task.assigned_to === user.id || task.assigned_by === user.id;
  const hasOversight = role
    ? (TASK_OVERSIGHT_ROLES as readonly string[]).includes(role)
    : false;

  if (!isParticipant && !hasOversight) {
    return { ok: false, status: 403, error: 'You do not have access to this task' };
  }

  return {
    ok: true,
    task: task as {
      id: string;
      title: string;
      assigned_to: string | null;
      assigned_by: string;
    },
  };
}
