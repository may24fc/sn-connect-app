import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export const GLOBAL_WORK_MANAGER_ROLES = ['admin', 'super_admin'] as const;

export function isGlobalWorkManager(role: string | null | undefined): boolean {
  return !!role && (GLOBAL_WORK_MANAGER_ROLES as ReadonlyArray<string>).includes(role);
}

export interface WorkManagementScope {
  isGlobal: boolean;
  departmentId: string | null;
  ledDepartmentIds: Array<string>;
}

interface AssignmentTarget {
  department_id: string | null;
  role: string;
  status: string;
}

function isManagedMember(target: AssignmentTarget, ledDepartmentIds: Array<string>): boolean {
  return (
    target.status !== 'terminated' &&
    ['employee', 'associate'].includes(target.role) &&
    !!target.department_id &&
    ledDepartmentIds.includes(target.department_id)
  );
}

export async function getWorkManagementScope(
  supabaseAdmin: AdminClient,
  userId: string,
  role: string | null | undefined
): Promise<WorkManagementScope> {
  const [{ data: user, error: userError }, { data: leadRows, error: leadsError }] =
    await Promise.all([
      supabaseAdmin
        .from('users')
        .select('department_id, status')
        .eq('id', userId)
        .is('deleted_at', null)
        .maybeSingle(),
      supabaseAdmin
        .from('department_leads')
        .select('department_id')
        .eq('user_id', userId)
        .is('revoked_at', null),
    ]);

  if (userError || leadsError) {
    throw new Error('Failed to load work-management scope');
  }

  const departmentId = user?.department_id ?? null;
  // Appointments, not home department or account kind, grant lead authority.
  const ledDepartmentIds =
    user && user.status !== 'terminated'
      ? [...new Set((leadRows ?? []).map((row) => row.department_id))]
      : [];

  return {
    isGlobal: isGlobalWorkManager(role),
    departmentId,
    ledDepartmentIds,
  };
}

export async function getActiveProjectDepartmentIds(
  supabaseAdmin: AdminClient,
  projectId: string
): Promise<Array<string>> {
  const { data, error } = await supabaseAdmin
    .from('project_departments')
    .select('department_id')
    .eq('project_id', projectId)
    .eq('status', 'active');
  if (error) throw new Error('Failed to load project departments');
  return (data ?? []).map((row) => row.department_id);
}

export async function canManageProject(
  supabaseAdmin: AdminClient,
  projectId: string,
  userId: string,
  role: string | null | undefined
): Promise<boolean> {
  if (isGlobalWorkManager(role)) return true;

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('lead_user_id, supervisor_id, created_by')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();
  if (projectError) throw new Error('Failed to load project management access');
  if (!project) return false;
  if (
    project.lead_user_id === userId ||
    project.supervisor_id === userId ||
    project.created_by === userId
  ) {
    return true;
  }

  const { data: coLead, error: coLeadError } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('role', 'lead')
    .maybeSingle();
  if (coLeadError) throw new Error('Failed to load project lead access');
  if (coLead) {
    const { data: leadUser, error: leadUserError } = await supabaseAdmin
      .from('users')
      .select('status')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (leadUserError) throw new Error('Failed to validate project lead access');
    if (leadUser && leadUser.status !== 'terminated') return true;
  }

  const [scope, projectDepartmentIds] = await Promise.all([
    getWorkManagementScope(supabaseAdmin, userId, role),
    getActiveProjectDepartmentIds(supabaseAdmin, projectId),
  ]);
  return scope.ledDepartmentIds.some((id) => projectDepartmentIds.includes(id));
}

export async function canAssignUser(
  supabaseAdmin: AdminClient,
  actorId: string,
  actorRole: string | null | undefined,
  targetUserId: string,
  projectId?: string | null
): Promise<boolean> {
  if (isGlobalWorkManager(actorRole)) return true;
  if (actorId === targetUserId) return !projectId;

  const [scope, targetResult] = await Promise.all([
    getWorkManagementScope(supabaseAdmin, actorId, actorRole),
    supabaseAdmin
      .from('users')
      .select('department_id, role, status')
      .eq('id', targetUserId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);
  if (targetResult.error) throw new Error('Failed to validate assignment target');
  const target = targetResult.data;
  if (!target || !isManagedMember(target, scope.ledDepartmentIds)) {
    return false;
  }

  if (!projectId) return true;
  const projectDepartmentIds = await getActiveProjectDepartmentIds(supabaseAdmin, projectId);
  return !!target.department_id && projectDepartmentIds.includes(target.department_id);
}

export async function classifyProjectMemberAssignments(
  supabaseAdmin: AdminClient,
  actorId: string,
  actorRole: string | null | undefined,
  targetUserIds: Array<string>
): Promise<
  | { ok: true; directUserIds: Array<string>; invitationUserIds: Array<string> }
  | { ok: false; status: number; error: string }
> {
  const ids = [...new Set(targetUserIds)];
  if (ids.length === 0) return { ok: true, directUserIds: [], invitationUserIds: [] };
  const { data: targets, error } = await supabaseAdmin
    .from('users')
    .select('id, department_id, role, status')
    .in('id', ids)
    .is('deleted_at', null);

  if (error) {
    console.error('Failed to validate project members:', error);
    return { ok: false, status: 500, error: 'Failed to validate project members' };
  }
  if (
    !targets ||
    targets.length !== ids.length ||
    targets.some((target) => target.status === 'terminated')
  ) {
    return { ok: false, status: 400, error: 'Project members must be active accounts' };
  }

  try {
    const scope = await getWorkManagementScope(supabaseAdmin, actorId, actorRole);
    const directUserIds: Array<string> = [];
    const invitationUserIds: Array<string> = [];
    for (const target of targets) {
      if (
        target.id === actorId ||
        (target.department_id && scope.ledDepartmentIds.includes(target.department_id))
      ) {
        directUserIds.push(target.id);
      } else {
        invitationUserIds.push(target.id);
      }
    }
    return { ok: true, directUserIds, invitationUserIds };
  } catch (scopeError) {
    console.error('Failed to validate project assignment scope:', scopeError);
    return { ok: false, status: 500, error: 'Failed to validate project assignment scope' };
  }
}

export async function getManagedMemberIds(
  supabaseAdmin: AdminClient,
  userId: string,
  role: string | null | undefined
): Promise<Array<string> | null> {
  const scope = await getWorkManagementScope(supabaseAdmin, userId, role);
  if (scope.isGlobal) return null;
  if (scope.ledDepartmentIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('department_id', scope.ledDepartmentIds)
    .in('role', ['employee', 'associate'])
    .is('deleted_at', null)
    .neq('status', 'terminated');
  if (error) throw new Error('Failed to load managed members');
  return (data ?? []).map((row) => row.id);
}
