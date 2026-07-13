import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveUserDisplayName } from '@/lib/user-display';

export interface RevenueForecastAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
  hasGrant: boolean;
}

export interface RevenueForecastGrantRecord {
  id: string;
  userId: string;
  accessLevel: string;
  grantedAt: string;
  grantedBy: string | null;
  grantedByName: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
}

async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; app_metadata?: Record<string, unknown> }
): Promise<string | null> {
  if (typeof user.app_metadata?.db_role === 'string') {
    return user.app_metadata.db_role;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve Revenue Forecast role:', error);
    return null;
  }

  return data?.role ?? null;
}

async function resolveRevenueForecastGrant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('revenue_forecast_access_grants')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve Revenue Forecast grant:', error);
    return false;
  }

  return Boolean(data?.id);
}

export function isRevenueForecastAdmin(role: string | null): boolean {
  return role === 'super_admin';
}

export function hasRevenueForecastAccess(role: string | null, hasGrant: boolean): boolean {
  return isRevenueForecastAdmin(role) || hasGrant;
}

export async function getRevenueForecastAuthedContext(): Promise<
  { ok: true; context: RevenueForecastAuthedContext } | { ok: false; status: number; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }

    const role = await resolveUserRole(supabase, user);
    const hasGrant = isRevenueForecastAdmin(role)
      ? false
      : await resolveRevenueForecastGrant(supabase, user.id);

    if (!hasRevenueForecastAccess(role, hasGrant)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return {
      ok: true,
      context: {
        supabase,
        supabaseAdmin,
        user,
        role,
        hasGrant,
      },
    };
  } catch (error) {
    console.error('Failed to build Revenue Forecast auth context:', error);
    return { ok: false, status: 500, error: 'Internal server error' };
  }
}

export async function listRevenueForecastAccessGrants(): Promise<
  Array<RevenueForecastGrantRecord>
> {
  const admin = createSupabaseAdminClient();

  const { data: grantRows, error: grantsError } = await admin
    .from('revenue_forecast_access_grants')
    .select('id, user_id, access_level, created_at, granted_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (grantsError) {
    throw grantsError;
  }

  if (!grantRows || grantRows.length === 0) {
    return [];
  }

  const userIds = [...new Set(grantRows.map((row) => row.user_id))];
  const granterIds = [
    ...new Set(grantRows.map((row) => row.granted_by).filter(Boolean)),
  ] as Array<string>;

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

  const employeeByUserId = new Map((employeeRows ?? []).map((row) => [row.user_id, row]));
  const userById = new Map((userRows ?? []).map((row) => [row.id, row]));

  const authEmailById = new Map<string, string>();
  for (const userId of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (!error && data.user?.email) {
      authEmailById.set(userId, data.user.email);
    }
  }

  return grantRows.map((row) => {
    const employee = employeeByUserId.get(row.user_id);
    const granterEmployee = row.granted_by ? employeeByUserId.get(row.granted_by) : null;
    const fullName = employee
      ? resolveUserDisplayName({
          employeeFirstName: employee.first_name,
          employeeMiddleName: employee.middle_name,
          employeeLastName: employee.last_name,
          fallbackLabel: authEmailById.get(row.user_id) ?? 'Revenue user',
        })
      : (authEmailById.get(row.user_id) ?? 'Revenue user');

    const grantedByName = granterEmployee
      ? resolveUserDisplayName({
          employeeFirstName: granterEmployee.first_name,
          employeeMiddleName: granterEmployee.middle_name,
          employeeLastName: granterEmployee.last_name,
          fallbackLabel: 'Super admin',
        })
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
