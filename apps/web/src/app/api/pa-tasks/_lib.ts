import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveUserDisplayName } from '@/lib/user-display';

export const PA_TASK_ASSIGNABLE_ROLES = ['employee', 'associate'] as const;
export const PA_TASK_ADMIN_ROLES = ['admin', 'super_admin'] as const;

type PaTaskAssignableRole = (typeof PA_TASK_ASSIGNABLE_ROLES)[number];
type PaTaskAdminRole = (typeof PA_TASK_ADMIN_ROLES)[number];

export type PaTaskAccessLevel = 'member' | 'manager' | 'admin';

export interface PaTaskAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; email?: string | undefined; app_metadata?: Record<string, unknown> };
  role: string | null;
  accessLevel: PaTaskAccessLevel | null;
  hasGrant: boolean;
  canAccess: boolean;
  canManage: boolean;
}

interface PaTaskGrantRow {
  access_level: PaTaskAccessLevel;
}

export function isPaTaskAdmin(role: string | null): role is PaTaskAdminRole {
  return role ? PA_TASK_ADMIN_ROLES.includes(role as PaTaskAdminRole) : false;
}

export function canAssignPaTaskRole(role: string): role is PaTaskAssignableRole {
  return PA_TASK_ASSIGNABLE_ROLES.includes(role as PaTaskAssignableRole);
}

export function isMissingPaTaskGrantTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST205' &&
    typeof message === 'string' &&
    (message.includes('public.pa_task_access_grants') ||
      message.includes('pa_task_access_grants'))
  );
}

function resolveAccessLevel(row: PaTaskGrantRow | null): PaTaskAccessLevel | null {
  return row?.access_level ?? null;
}

export function hasPaTaskAccess(role: string | null, hasGrant: boolean): boolean {
  return isPaTaskAdmin(role) || hasGrant;
}

export function canManagePaTasks(
  role: string | null,
  accessLevel: PaTaskAccessLevel | null
): boolean {
  return isPaTaskAdmin(role) || accessLevel === 'manager' || accessLevel === 'admin';
}

export async function getPaTaskAuthedContext(): Promise<
  { ok: true; context: PaTaskAuthedContext } | { ok: false; status: number; error: string }
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
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      console.error('Failed to resolve user role for PA tasks:', roleError);
      return { ok: false, status: 500, error: 'Failed to resolve user role' };
    }

    role = roleData?.role ?? null;
  }

  const { data: grantRow, error: grantError } = await supabaseAdmin
    .from('pa_task_access_grants')
    .select('access_level')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (grantError && !isMissingPaTaskGrantTableError(grantError)) {
    console.error('Failed to resolve PA task grant:', grantError);
    return { ok: false, status: 500, error: 'Failed to resolve PA task access' };
  }

  const accessLevel = grantError
    ? null
    : resolveAccessLevel((grantRow as PaTaskGrantRow | null) ?? null);
  const hasGrant = Boolean(accessLevel);
  const canAccess = hasPaTaskAccess(role, hasGrant);
  const canManage = canManagePaTasks(role, accessLevel);

  if (grantError && isMissingPaTaskGrantTableError(grantError)) {
    console.warn(
      'PA task grant table is not available in this environment; allowing admins/super-admins through without grant rows.'
    );
  }

  return {
    ok: true,
    context: {
      supabase,
      supabaseAdmin,
      user,
      role,
      accessLevel,
      hasGrant,
      canAccess,
      canManage,
    },
  };
}

export async function validatePaTaskAssignee(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  assigneeId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, role, status')
    .eq('id', assigneeId)
    .is('deleted_at', null)
    .neq('status', 'terminated')
    .maybeSingle();

  if (userError) {
    console.error('Failed to validate PA task assignee user:', userError);
    return { ok: false, status: 500, error: 'Failed to validate assignee' };
  }

  if (!userRow) {
    return { ok: false, status: 404, error: 'Assigned user not found' };
  }

  if (!canAssignPaTaskRole(userRow.role)) {
    return {
      ok: false,
      status: 400,
      error: 'Assigned user must be an employee or associate',
    };
  }

  const { data: grantRow, error: grantError } = await supabaseAdmin
    .from('pa_task_access_grants')
    .select('id')
    .eq('user_id', assigneeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (grantError && !isMissingPaTaskGrantTableError(grantError)) {
    console.error('Failed to validate assignee PA task grant:', grantError);
    return { ok: false, status: 500, error: 'Failed to validate assignee access grant' };
  }

  if (grantError && isMissingPaTaskGrantTableError(grantError)) {
    return {
      ok: false,
      status: 503,
      error: 'PA task access grants are not configured in this environment yet',
    };
  }

  if (!grantRow?.id) {
    return {
      ok: false,
      status: 400,
      error: 'Assigned user must hold an active PA/EA task tracker grant',
    };
  }

  return { ok: true };
}

export function getPaTaskWriteErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) {
    return 'PA task operation failed';
  }

  if (error.code === '23503') {
    return 'Referenced record does not exist';
  }

  if (error.code === '23505') {
    return 'A conflicting record already exists';
  }

  if (error.code === '23514') {
    return 'Submitted data does not satisfy required constraints';
  }

  return error.message || 'PA task operation failed';
}

export interface AccessGrantListRow {
  id: string;
  user_id: string;
  access_level: PaTaskAccessLevel;
  created_at: string;
  updated_at: string;
  granted_by: string | null;
}

async function resolveAuthEmails(userIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return emailMap;
  }

  const admin = createSupabaseAdminClient();
  for (const userId of uniqueIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) {
      continue;
    }
    emailMap.set(userId, data.user.email);
  }

  return emailMap;
}

export async function listPaTaskAccessGrants() {
  const admin = createSupabaseAdminClient();
  const { data: grantRows, error: grantError } = await admin
    .from('pa_task_access_grants')
    .select('id, user_id, access_level, created_at, updated_at, granted_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (grantError) {
    if (isMissingPaTaskGrantTableError(grantError)) {
      console.warn('PA task access grants table is not available in this environment; returning empty list.');
      return [] as AccessGrantListRow[];
    }
    throw grantError;
  }

  const rows = (grantRows ?? []) as AccessGrantListRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const granterIds = [...new Set(rows.map((r) => r.granted_by).filter(Boolean))] as string[];
  const allIds = [...new Set([...userIds, ...granterIds])];

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, role')
    .in('id', allIds)
    .is('deleted_at', null);

  if (usersError) {
    throw usersError;
  }

  const { data: employees, error: employeeError } = await admin
    .from('employees')
    .select('user_id, first_name, middle_name, last_name, position, department')
    .in('user_id', allIds)
    .is('deleted_at', null);

  if (employeeError) {
    throw employeeError;
  }

  const emailsByUser = await resolveAuthEmails(userIds);
  const employeeByUserId = new Map((employees ?? []).map((row) => [row.user_id, row]));
  const userById = new Map((users ?? []).map((row) => [row.id, row]));

  return rows.map((row) => {
    const employee = employeeByUserId.get(row.user_id);
    const granterEmployee = row.granted_by ? employeeByUserId.get(row.granted_by) : null;

    const fullName = employee
      ? resolveUserDisplayName({
          employeeFirstName: employee.first_name,
          employeeMiddleName: employee.middle_name,
          employeeLastName: employee.last_name,
          fallbackEmail: emailsByUser.get(row.user_id) ?? null,
          fallbackLabel: 'PA task user',
        })
      : (emailsByUser.get(row.user_id) ?? 'PA task user');

    const grantedByName = granterEmployee
      ? resolveUserDisplayName({
          employeeFirstName: granterEmployee.first_name,
          employeeMiddleName: granterEmployee.middle_name,
          employeeLastName: granterEmployee.last_name,
          fallbackLabel: 'System',
        })
      : null;

    const userRow = userById.get(row.user_id);

    return {
      id: row.id,
      userId: row.user_id,
      accessLevel: row.access_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      grantedBy: row.granted_by,
      grantedByName,
      fullName,
      email: emailsByUser.get(row.user_id) ?? null,
      role: userRow?.role ?? null,
      position: employee?.position ?? null,
      department: employee?.department ?? null,
    };
  });
}
