import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';

export const CRM_TRACKER_VALUES = ['meta_leads', 'google_ads_leads', 'sn_tech_inquiries'] as const;
export type CrmTrackerKey = (typeof CRM_TRACKER_VALUES)[number];

interface CrmAccessGrantTrackerRow {
  tracker: string | null;
}

export interface CrmAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
  grantedTrackers: CrmTrackerKey[];
}

async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; app_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const metadataRole = getNormalizedMetadataRole(user.app_metadata);

  if (metadataRole) {
    return metadataRole;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve user role');
  }

  return normalizeDbRoleClaim(data?.role ?? null);
}

export function canAccessCrm(role: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function getSfoTrackerKey(platform: 'Meta' | 'Google Ads'): CrmTrackerKey {
  return platform === 'Google Ads' ? 'google_ads_leads' : 'meta_leads';
}

async function resolveCrmGrants(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<CrmTrackerKey[]> {
  const { data, error } = await supabase
    .from('crm_access_grants')
    .select('tracker')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) {
    console.error('Failed to resolve CRM grants:', error);
    return [];
  }

  const grantRows: CrmAccessGrantTrackerRow[] = data ?? [];

  return grantRows
    .map((row: CrmAccessGrantTrackerRow) => row.tracker)
    .filter((tracker: CrmAccessGrantTrackerRow['tracker']): tracker is CrmTrackerKey =>
      CRM_TRACKER_VALUES.includes(tracker as CrmTrackerKey)
    );
}

export function canAccessCrmTracker(
  role: string | null,
  grantedTrackers: CrmTrackerKey[],
  tracker: CrmTrackerKey,
): boolean {
  return canAccessCrm(role) || grantedTrackers.includes(tracker);
}

export function assertCrmTrackerAccess(
  role: string | null,
  grantedTrackers: CrmTrackerKey[],
  tracker: CrmTrackerKey,
): { ok: true } | { ok: false; status: number; error: string } {
  if (canAccessCrmTracker(role, grantedTrackers, tracker)) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

export function isCrmAdmin(role: string | null): boolean {
  return canAccessCrm(role);
}

export async function listCrmAccessGrants(
  tracker?: CrmTrackerKey,
) {
  const admin = createSupabaseAdminClient();

  let grantsQuery = admin
    .from('crm_access_grants')
    .select('id, user_id, tracker, created_at, updated_at, granted_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (tracker) {
    grantsQuery = grantsQuery.eq('tracker', tracker);
  }

  const { data: grantRows, error: grantsError } = await grantsQuery;

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
    .in('user_id', userIds)
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
    const userRow = userById.get(row.user_id);
    const employee = employeeByUserId.get(row.user_id);

    // Prefer the `employees` table (or `employee_directory` view) for display names
    const fullName = (
      employee
        ? [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ').trim()
        : authEmailById.get(row.user_id) ?? null
    ) || 'CRM user';

    const granterEmployee = row.granted_by ? employeeByUserId.get(row.granted_by) : null;
    const grantedByName = granterEmployee
      ? [granterEmployee.first_name, granterEmployee.last_name].filter(Boolean).join(' ').trim() || null
      : null;

    return {
      id: row.id,
      userId: row.user_id,
      tracker: row.tracker,
      grantedAt: row.created_at,
      grantedBy: row.granted_by,
      grantedByName,
      fullName,
      email: authEmailById.get(row.user_id) ?? null,
      role: userRow?.role ?? null,
      department: employee?.department ?? null,
      position: employee?.position ?? null,
    };
  });
}

export async function getCrmAuthedContext(): Promise<
  { ok: true; context: CrmAuthedContext } | { ok: false; status: number; error: string }
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
    const grantedTrackers = canAccessCrm(role) ? [] : await resolveCrmGrants(supabase, user.id);

    if (!canAccessCrm(role) && grantedTrackers.length === 0) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return {
      ok: true,
      context: {
        supabase,
        supabaseAdmin,
        user,
        role,
        grantedTrackers,
      },
    };
  } catch (error) {
    console.error('Failed to initialize CRM auth context:', error);
    return { ok: false, status: 500, error: 'Failed to initialize request context' };
  }
}
