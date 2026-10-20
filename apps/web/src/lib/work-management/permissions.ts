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

export async function getWorkManagementScope(
  supabaseAdmin: AdminClient,
  userId: string,
  role: string | null | undefined
): Promise<WorkManagementScope> {
  const [{ data: user }, { data: leadRows }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('department_id')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabaseAdmin
      .from('department_leads')
      .select('department_id')
      .eq('user_id', userId)
      .is('revoked_at', null),
  ]);

  const departmentId = user?.department_id ?? null;
  // A stale appointment never grants authority after a person changes departments.
  const ledDepartmentIds = (leadRows ?? [])
    .map((row) => row.department_id)
    .filter((id) => id === departmentId);

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
  const { data } = await supabaseAdmin
    .from('project_departments')
    .select('department_id')
    .eq('project_id', projectId)
    .eq('status', 'active');
  return (data ?? []).map((row) => row.department_id);
}

export async function canManageProject(
  supabaseAdmin: AdminClient,
  projectId: string,
  userId: string,
  role: string | null | undefined
): Promise<boolean> {
  if (isGlobalWorkManager(role)) return true;

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('lead_user_id, supervisor_id, created_by')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!project) return false;
  if (
    project.lead_user_id === userId ||
    project.supervisor_id === userId ||
    project.created_by === userId
  ) {
    return true;
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
  const target = targetResult.data;
  if (
    !target ||
    target.status === 'terminated' ||
    !['employee', 'associate'].includes(target.role) ||
    !target.department_id ||
    !scope.ledDepartmentIds.includes(target.department_id)
  ) {
    return false;
  }

  if (!projectId) return true;
  const projectDepartmentIds = await getActiveProjectDepartmentIds(supabaseAdmin, projectId);
  return projectDepartmentIds.includes(target.department_id);
}

export async function getManagedMemberIds(
  supabaseAdmin: AdminClient,
  userId: string,
  role: string | null | undefined
): Promise<Array<string> | null> {
  const scope = await getWorkManagementScope(supabaseAdmin, userId, role);
  if (scope.isGlobal) return null;
  if (scope.ledDepartmentIds.length === 0) return [];

  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('department_id', scope.ledDepartmentIds)
    .in('role', ['employee', 'associate'])
    .is('deleted_at', null)
    .neq('status', 'terminated');
  return (data ?? []).map((row) => row.id);
}
