import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';
import { resolveUserDisplayName } from '@/lib/user-display';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRoleType = 'employee' | 'associate' | 'admin' | 'super_admin';

export type UserStatusType =
  | 'active'
  | 'inactive'
  | 'on_leave'
  | 'terminated'
  | 'pending_onboarding'
  | 'awaiting_approval';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  status?: UserStatusType;
  avatarUrl?: string;
  isOnboardingComplete?: boolean;
}

export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

interface UserRecord {
  role: string | null;
  status: string | null;
}

interface OnboardingRecord {
  is_completed: boolean | null;
  first_name: string | null;
  last_name: string | null;
}

export function resolveUiRole(role: string | null | undefined): UserRoleType {
  const normalizedRole = normalizeDbRoleClaim(role);

  switch (normalizedRole) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
    case 'hr':
    case 'cos':
    case 'ceo':
      return 'admin';
    case 'associate':
      return 'associate';
    default:
      return 'employee';
  }
}

function needsOnboardingProfile(role: UserRoleType | null): boolean {
  return role === 'employee' || role === 'associate';
}

function queryUserRecord(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('users')
    .select('role, status')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
}

function queryOnboardingRecord(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('onboarding_profiles')
    .select('is_completed, first_name, last_name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
}

type UserQueryResult = Awaited<ReturnType<typeof queryUserRecord>>;
type OnboardingQueryResult = Awaited<ReturnType<typeof queryOnboardingRecord>>;

async function loadInitialRecords(
  supabase: SupabaseClient,
  userId: string,
  metadataRole: UserRoleType | null
): Promise<{
  userResult: UserQueryResult;
  onboardingResult: OnboardingQueryResult | null;
}> {
  const userRecordPromise = queryUserRecord(supabase, userId);

  if (!needsOnboardingProfile(metadataRole)) {
    return { userResult: await userRecordPromise, onboardingResult: null };
  }

  const [userResult, onboardingResult] = await Promise.all([
    userRecordPromise,
    queryOnboardingRecord(supabase, userId),
  ]);
  return { userResult, onboardingResult };
}

function resolveOnboardingComplete(
  role: UserRoleType,
  result: OnboardingQueryResult | null
): boolean {
  if (!needsOnboardingProfile(role) || result?.error) {
    return true;
  }

  const profile = result?.data as OnboardingRecord | null;
  return profile?.is_completed ?? false;
}

async function completeOnboardingLookup(
  supabase: SupabaseClient,
  userId: string,
  role: UserRoleType,
  initialResult: OnboardingQueryResult | null
): Promise<OnboardingQueryResult | null> {
  const result =
    initialResult ??
    (needsOnboardingProfile(role) ? await queryOnboardingRecord(supabase, userId) : null);

  if (result?.error) {
    console.warn(
      'Failed to fetch onboarding status; treating onboarding as non-blocking:',
      result.error.message
    );
  }

  return result;
}

function resolveAuthUserName(
  authUser: AuthUserLike,
  onboardingProfile: OnboardingRecord | null
): string {
  return resolveUserDisplayName({
    metadataFullName:
      typeof authUser.user_metadata?.full_name === 'string'
        ? authUser.user_metadata.full_name
        : null,
    metadataName:
      typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : null,
    metadataFirstName:
      typeof authUser.user_metadata?.first_name === 'string'
        ? authUser.user_metadata.first_name
        : null,
    metadataLastName:
      typeof authUser.user_metadata?.last_name === 'string'
        ? authUser.user_metadata.last_name
        : null,
    onboardingFirstName: onboardingProfile?.first_name ?? null,
    onboardingLastName: onboardingProfile?.last_name ?? null,
    fallbackEmail: authUser.email ?? null,
  });
}

/**
 * Resolves the minimal user snapshot needed by auth routing and the signed-in shell.
 * When a JWT role identifies an employee/associate, account and onboarding records
 * are fetched concurrently instead of serially.
 */
export async function resolveAuthenticatedUser(
  supabase: SupabaseClient,
  authUser: AuthUserLike
): Promise<AuthenticatedUser> {
  let dbRole = getNormalizedMetadataRole(authUser.app_metadata);
  const metadataRole = dbRole ? resolveUiRole(dbRole) : null;
  const initialRecords = await loadInitialRecords(supabase, authUser.id, metadataRole);
  const { userResult } = initialRecords;
  let { onboardingResult } = initialRecords;

  if (userResult.error) {
    console.error('Failed to fetch user role and status:', userResult.error.message);
  }

  const userRecord = userResult.data as UserRecord | null;
  dbRole = normalizeDbRoleClaim(userRecord?.role ?? dbRole);
  const resolvedRole = resolveUiRole(dbRole);

  // Metadata can be absent or stale. If the database resolves to an onboarding
  // role, fetch the profile now unless it was already loaded in parallel.
  onboardingResult = await completeOnboardingLookup(
    supabase,
    authUser.id,
    resolvedRole,
    onboardingResult
  );

  const onboardingProfile = (onboardingResult?.data as OnboardingRecord | null) ?? null;
  const isOnboardingComplete = resolveOnboardingComplete(resolvedRole, onboardingResult);

  const avatarUrlFromMetadata =
    typeof authUser.user_metadata?.avatar_url === 'string'
      ? authUser.user_metadata.avatar_url
      : undefined;

  const name = resolveAuthUserName(authUser, onboardingProfile);

  return {
    id: authUser.id,
    name,
    email: authUser.email ?? '',
    role: resolvedRole,
    status: (userRecord?.status as UserStatusType | null) ?? 'active',
    isOnboardingComplete,
    ...(avatarUrlFromMetadata ? { avatarUrl: avatarUrlFromMetadata } : {}),
  };
}
