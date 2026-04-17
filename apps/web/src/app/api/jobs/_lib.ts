import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveUserDisplayName } from '@/lib/user-display';

export const JOB_ADMIN_ROLES = ['admin', 'super_admin'];

export interface AtsReviewerIdentity {
  id: string;
  displayName: string;
}

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { supabase, user, role: null, error: 'Failed to resolve user role' as const };
    }

    role = roleData?.role ?? null;
  }

  const hasAtsGrant =
    role !== 'admin' && role !== 'super_admin'
      ? await resolveAtsGrant(supabase, user.id)
      : false;

  return { supabase, user, role, hasAtsGrant, error: null };
}

export function isJobAdmin(role: string | null) {
  return role ? JOB_ADMIN_ROLES.includes(role) : false;
}

export function isSuperAdmin(role: string | null) {
  return role === 'super_admin';
}

export function hasAtsAccess(role: string | null, hasAtsGrant: boolean) {
  return isJobAdmin(role) || hasAtsGrant;
}

async function resolveAtsGrant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ats_access_grants')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve ATS grant:', error);
    return false;
  }

  return Boolean(data?.id);
}

export async function resolveReviewerIdentities(userIds: string[]): Promise<Map<string, AtsReviewerIdentity>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const identityMap = new Map<string, AtsReviewerIdentity>();

  if (uniqueIds.length === 0) {
    return identityMap;
  }

  const admin = createSupabaseAdminClient();

  const { data: employeeRows, error: employeeError } = await admin
    .from('employees')
    .select('user_id, first_name, middle_name, last_name')
    .in('user_id', uniqueIds)
    .is('deleted_at', null);

  if (employeeError) {
    console.error('Failed to resolve ATS reviewer employees:', employeeError);
  } else {
    for (const employee of employeeRows ?? []) {
      identityMap.set(employee.user_id, {
        id: employee.user_id,
        displayName: resolveUserDisplayName({
          employeeFirstName: employee.first_name,
          employeeMiddleName: employee.middle_name,
          employeeLastName: employee.last_name,
          fallbackLabel: 'ATS user',
        }),
      });
    }
  }

  for (const userId of uniqueIds) {
    if (identityMap.has(userId)) {
      continue;
    }

    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      console.error('Failed to resolve ATS reviewer auth user:', error);
      continue;
    }

    identityMap.set(userId, {
      id: userId,
      displayName: resolveUserDisplayName({
        metadataFullName:
          typeof data.user.user_metadata?.full_name === 'string'
            ? data.user.user_metadata.full_name
            : null,
        metadataName:
          typeof data.user.user_metadata?.name === 'string'
            ? data.user.user_metadata.name
            : null,
        metadataFirstName:
          typeof data.user.user_metadata?.first_name === 'string'
            ? data.user.user_metadata.first_name
            : null,
        metadataMiddleName:
          typeof data.user.user_metadata?.middle_name === 'string'
            ? data.user.user_metadata.middle_name
            : null,
        metadataLastName:
          typeof data.user.user_metadata?.last_name === 'string'
            ? data.user.user_metadata.last_name
            : null,
        fallbackEmail: data.user.email ?? null,
        fallbackLabel: 'ATS user',
      }),
    });
  }

  return identityMap;
}

async function resolveAuthEmails(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const emailMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return emailMap;
  }

  const admin = createSupabaseAdminClient();

  for (const userId of uniqueIds) {
    const { data, error } = await admin.auth.admin.getUserById(userId);

    if (error || !data.user?.email) {
      if (error) {
        console.error('Failed to resolve ATS auth email:', error);
      }

      continue;
    }

    emailMap.set(userId, data.user.email);
  }

  return emailMap;
}

export async function listAtsAccessGrants() {
  const admin = createSupabaseAdminClient();

  const { data: grantRows, error: grantsError } = await admin
    .from('ats_access_grants')
    .select('id, user_id, access_level, created_at, updated_at, granted_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (grantsError) {
    throw grantsError;
  }

  const userIds = [...new Set((grantRows ?? []).map((row) => row.user_id))];
  const granterIds = [...new Set((grantRows ?? []).map((row) => row.granted_by).filter(Boolean))] as string[];
  const identities = await resolveReviewerIdentities([...userIds, ...granterIds]);
  const authEmails = await resolveAuthEmails(userIds);

  const { data: userRows, error: usersError } = await admin
    .from('users')
    .select('id, role')
    .in('id', userIds)
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

  const employeeByUserId = new Map((employeeRows ?? []).map((row) => [row.user_id, row]));
  const userById = new Map((userRows ?? []).map((row) => [row.id, row]));

  return (grantRows ?? []).map((row) => {
    const employee = employeeByUserId.get(row.user_id);
    const userRow = userById.get(row.user_id);
    const authEmail = authEmails.get(row.user_id) ?? null;
    const reviewerIdentity = identities.get(row.user_id);
    const granterIdentity = row.granted_by ? identities.get(row.granted_by) : null;
    const fullName = employee
      ? resolveUserDisplayName({
          employeeFirstName: employee.first_name,
          employeeMiddleName: employee.middle_name,
          employeeLastName: employee.last_name,
          fallbackLabel: reviewerIdentity?.displayName ?? 'ATS user',
        })
      : (reviewerIdentity?.displayName ?? authEmail ?? 'ATS user');

    return {
      id: row.id,
      userId: row.user_id,
      accessLevel: row.access_level,
      createdAt: row.created_at,
      grantedAt: row.created_at,
      updatedAt: row.updated_at,
      fullName,
      granteeName: fullName,
      email: authEmail,
      role: userRow?.role ?? null,
      grantedBy: row.granted_by,
      grantedByName: granterIdentity?.displayName ?? null,
      position: employee?.position ?? null,
      department: employee?.department ?? null,
    };
  });
}
