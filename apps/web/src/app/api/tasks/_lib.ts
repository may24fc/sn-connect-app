import { type DirectoryPerson, loadDirectoryPeople } from '@/lib/people/directory-people';
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

export async function validateTaskProjectLink(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  projectId: string | null,
  milestoneId: string | null,
  userId: string,
  role: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!projectId && milestoneId) {
    return { ok: false, status: 400, error: 'A milestone requires a project' };
  }
  if (!projectId) return { ok: true };

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, lead_user_id, supervisor_id, created_by')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: 'Failed to validate project' };
  if (!project) return { ok: false, status: 400, error: 'Project was not found' };

  const hasAdminAccess = ['admin', 'hr', 'cos', 'ceo', 'super_admin'].includes(role ?? '');
  let canAccess =
    hasAdminAccess ||
    project.lead_user_id === userId ||
    project.supervisor_id === userId ||
    project.created_by === userId;

  if (!canAccess) {
    const { data: contributor } = await supabaseAdmin
      .from('project_contributors')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    canAccess = !!contributor;
  }
  if (!canAccess) return { ok: false, status: 403, error: 'Project access denied' };

  if (milestoneId) {
    const { data: milestone } = await supabaseAdmin
      .from('project_milestones')
      .select('id')
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!milestone) {
      return { ok: false, status: 400, error: 'Milestone does not belong to the project' };
    }
  }

  return { ok: true };
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
  | {
      ok: true;
      task: { id: string; title: string; assigned_to: string | null; assigned_by: string };
    }
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
  const hasOversight = role ? (TASK_OVERSIGHT_ROLES as readonly string[]).includes(role) : false;

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

/** Display identity of a task's assignee or assigner, as returned to the client. */
export interface TaskPersonPayload {
  id: string;
  name: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
}

export interface TaskPeopleFields {
  assignee_name: string | null;
  assigner_name: string | null;
  assignee: TaskPersonPayload | null;
  assigner: TaskPersonPayload | null;
}

function toTaskPerson(userId: string, person: DirectoryPerson | undefined): TaskPersonPayload {
  return {
    id: userId,
    name: person?.name ?? null,
    role: person?.role ?? null,
    department: person?.department ?? null,
    position: person?.position ?? null,
    avatar_url: person?.avatarUrl ?? null,
  };
}

/**
 * Adds assignee/assigner identity to tasks the caller has already been authorized to read.
 * Uses the admin client because the directory view is not readable by every task participant.
 */
export async function attachTaskPeople<
  T extends { assigned_to: string | null; assigned_by: string | null },
>(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  tasks: Array<T>
): Promise<Array<T & TaskPeopleFields>> {
  const people = await loadDirectoryPeople(
    supabaseAdmin,
    tasks.flatMap((task) => [task.assigned_to, task.assigned_by])
  );

  return tasks.map((task) => {
    const assignee = task.assigned_to
      ? toTaskPerson(task.assigned_to, people.get(task.assigned_to))
      : null;
    const assigner = task.assigned_by
      ? toTaskPerson(task.assigned_by, people.get(task.assigned_by))
      : null;

    return {
      ...task,
      assignee_name: assignee?.name ?? null,
      assigner_name: assigner?.name ?? null,
      assignee,
      assigner,
    };
  });
}
