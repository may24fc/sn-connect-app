import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const AI_SPENDING_ADMIN_ROLES = ['admin', 'super_admin'];
export const AI_SPENDING_GRANTABLE_ROLES = ['employee', 'associate'];

export function isAiSpendingAdmin(role: string | null): boolean {
  return role ? AI_SPENDING_ADMIN_ROLES.includes(role) : false;
}

export function hasAiSpendingAccess(role: string | null, hasGrant: boolean): boolean {
  return isAiSpendingAdmin(role) || hasGrant;
}

async function resolveAiSpendingGrant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ai_spending_access_grants')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve AI spending grant:', error);
    return false;
  }

  return Boolean(data?.id);
}

/** Resolves the caller's identity, role, and grant status without blocking access. */
export async function getAiSpendingAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, role: null, hasGrant: false, error: 'Unauthorized' as const };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (roleError) {
    return { supabase, user, role: null, hasGrant: false, error: 'Failed to resolve user role' as const };
  }

  const role = roleData?.role ?? null;
  const hasGrant = isAiSpendingAdmin(role) ? false : await resolveAiSpendingGrant(supabase, user.id);

  return { supabase, user, role, hasGrant, error: null };
}

/** Resolves auth and rejects with a typed error when the caller lacks feature access. */
export async function requireAiSpendingAccess(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; userId: string }
  | { ok: false; status: number; error: string }
> {
  const { supabase, user, role, hasGrant, error } = await getAiSpendingAuth();

  if (error || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  if (!hasAiSpendingAccess(role, hasGrant)) {
    return { ok: false, status: 403, error: 'You do not have access to AI Spending Tracker' };
  }

  return { ok: true, supabase, userId: user.id };
}

export async function listAiSpendingAccessGrants() {
  const admin = createSupabaseAdminClient();

  const { data: grantRows, error: grantsError } = await admin
    .from('ai_spending_access_grants')
    .select('id, user_id, access_level, created_at, updated_at, granted_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (grantsError) {
    throw grantsError;
  }

  if (!grantRows || grantRows.length === 0) {
    return [];
  }

  const userIds = [...new Set(grantRows.map((row) => row.user_id))];
  const granterIds = [...new Set(grantRows.map((row) => row.granted_by).filter(Boolean))] as string[];

  const { data: userRows, error: usersError } = await admin
    .from('users')
    .select('id, role')
    .in('id', [...new Set([...userIds, ...granterIds])])
    .is('deleted_at', null);

  if (usersError) {
    throw usersError;
  }

  const { data: employeeRows, error: employeeError } = await admin
    .from('employees')
    .select('user_id, first_name, middle_name, last_name, position, department')
    .in('user_id', [...new Set([...userIds, ...granterIds])])
    .is('deleted_at', null);

  if (employeeError) {
    throw employeeError;
  }

  const userById = new Map((userRows ?? []).map((row) => [row.id, row]));
  const employeeByUserId = new Map((employeeRows ?? []).map((row) => [row.user_id, row]));

  const authEmailById = new Map<string, string>();
  for (const userId of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (!error && data.user?.email) {
      authEmailById.set(userId, data.user.email);
    }
  }

  return grantRows.map((row) => {
    const employee = employeeByUserId.get(row.user_id);
    const fullName =
      (employee
        ? [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ').trim()
        : (authEmailById.get(row.user_id) ?? null)) || 'AI Spending user';

    const granterEmployee = row.granted_by ? employeeByUserId.get(row.granted_by) : null;
    const grantedByName = granterEmployee
      ? [granterEmployee.first_name, granterEmployee.last_name].filter(Boolean).join(' ').trim() || null
      : null;

    return {
      id: row.id,
      userId: row.user_id,
      accessLevel: row.access_level,
      grantedAt: row.created_at,
      grantedBy: row.granted_by,
      grantedByName,
      fullName,
      email: authEmailById.get(row.user_id) ?? null,
      role: userById.get(row.user_id)?.role ?? null,
      department: employee?.department ?? null,
      position: employee?.position ?? null,
    };
  });
}
