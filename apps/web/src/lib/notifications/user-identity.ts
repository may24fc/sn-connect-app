import { resolveUserDisplayName } from '@/lib/user-display';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface NotificationUserIdentity {
  userId: string;
  role: string | null;
  employeeId: string | null;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface NotificationUserRow {
  id: string;
  role: string | null;
}

interface NotificationEmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
}

interface NotificationOnboardingRow {
  user_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
}

function normalizeValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function getPreferredEmail(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return (
    normalizeValue(employee?.company_email) ??
    normalizeValue(employee?.personal_email) ??
    normalizeValue(onboarding?.company_email) ??
    normalizeValue(onboarding?.personal_email) ??
    null
  );
}

function getPreferredFirstName(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return (
    normalizeValue(employee?.first_name) ??
    normalizeValue(onboarding?.first_name) ??
    null
  );
}

function getPreferredLastName(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return (
    normalizeValue(employee?.last_name) ??
    normalizeValue(onboarding?.last_name) ??
    null
  );
}

function buildNotificationUserIdentity(
  userId: string,
  user: NotificationUserRow | undefined,
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): NotificationUserIdentity {
  const email = getPreferredEmail(employee, onboarding);

  return {
    userId,
    role: user?.role ?? null,
    employeeId: employee?.id ?? null,
    displayName: resolveUserDisplayName({
      employeeFirstName: employee?.first_name ?? null,
      employeeMiddleName: employee?.middle_name ?? null,
      employeeLastName: employee?.last_name ?? null,
      onboardingFirstName: onboarding?.first_name ?? null,
      onboardingMiddleName: onboarding?.middle_name ?? null,
      onboardingLastName: onboarding?.last_name ?? null,
      fallbackEmail: email,
      fallbackLabel: 'Team member',
    }),
    email,
    firstName: getPreferredFirstName(employee, onboarding),
    lastName: getPreferredLastName(employee, onboarding),
  };
}

export async function getNotificationUserIdentities(
  userIds: string[]
): Promise<Array<NotificationUserIdentity>> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const uniqueUserIds = Array.from(new Set(userIds));
  const [{ data: users, error: usersError }, { data: employees, error: employeesError }, { data: onboardingProfiles, error: onboardingError }] =
    await Promise.all([
      admin
        .from('users')
        .select('id, role')
        .in('id', uniqueUserIds)
        .is('deleted_at', null),
      admin
        .from('employees')
        .select('id, user_id, first_name, middle_name, last_name, company_email, personal_email')
        .in('user_id', uniqueUserIds)
        .is('deleted_at', null),
      admin
        .from('onboarding_profiles')
        .select('user_id, first_name, middle_name, last_name, company_email, personal_email')
        .in('user_id', uniqueUserIds)
        .is('deleted_at', null),
    ]);

  if (usersError) {
    console.error('[notifications] Failed to load users for notification identities:', usersError);
    return [];
  }

  if (employeesError) {
    console.error(
      '[notifications] Failed to load employees for notification identities:',
      employeesError
    );
    return [];
  }

  if (onboardingError) {
    console.error(
      '[notifications] Failed to load onboarding profiles for notification identities:',
      onboardingError
    );
    return [];
  }

  const userById = new Map((users ?? []).map((user) => [user.id, user as NotificationUserRow]));
  const employeeByUserId = new Map(
    (employees ?? [])
      .filter((employee) => employee.user_id)
      .map((employee) => [employee.user_id as string, employee as NotificationEmployeeRow])
  );
  const onboardingByUserId = new Map(
    (onboardingProfiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [profile.user_id as string, profile as NotificationOnboardingRow])
  );

  return uniqueUserIds.map((userId) =>
    buildNotificationUserIdentity(
      userId,
      userById.get(userId),
      employeeByUserId.get(userId),
      onboardingByUserId.get(userId)
    )
  );
}

export async function getNotificationUserIdentity(
  userId: string
): Promise<NotificationUserIdentity | null> {
  const [identity] = await getNotificationUserIdentities([userId]);
  return identity ?? null;
}