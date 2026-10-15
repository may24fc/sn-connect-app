import { isReviewEnvironment } from '@/lib/environment';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export type ActiveReviewContext = {
  userId: string;
  engagementId: string;
  sponsorUserId: string;
  expiresAt: string;
  purpose: string;
};

export async function getActiveReviewContext(): Promise<
  { context: ActiveReviewContext; error: null } | { context: null; error: string }
> {
  if (!isReviewEnvironment()) {
    return { context: null, error: 'Review access is unavailable in this environment' };
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { context: null, error: 'Unauthorized' };
  }

  const now = new Date().toISOString();
  const { data: account, error: accountError } = await admin
    .from('users')
    .select(
      'id, role, account_kind, sponsor_user_id, account_purpose, access_expires_at, deleted_at'
    )
    .eq('id', authData.user.id)
    .maybeSingle();

  if (
    accountError ||
    !account ||
    account.role !== 'reviewer' ||
    account.account_kind !== 'reviewer' ||
    account.deleted_at ||
    !account.access_expires_at ||
    account.access_expires_at <= now
  ) {
    return { context: null, error: 'Reviewer access is inactive or expired' };
  }

  const { data: engagement, error: engagementError } = await admin
    .from('review_engagements')
    .select('id, sponsor_user_id, purpose, expires_at')
    .eq('reviewer_user_id', authData.user.id)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now)
    .maybeSingle();

  if (engagementError || !engagement) {
    return { context: null, error: 'No active review engagement' };
  }

  return {
    context: {
      userId: authData.user.id,
      engagementId: engagement.id,
      sponsorUserId: engagement.sponsor_user_id,
      expiresAt: engagement.expires_at,
      purpose: engagement.purpose,
    },
    error: null,
  };
}

export async function getReviewSponsorContext(): Promise<
  { userId: string; role: 'super_admin'; error: null } | { userId: null; role: null; error: string }
> {
  if (!isReviewEnvironment()) {
    return { userId: null, role: null, error: 'Review access is unavailable in this environment' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { userId: null, role: null, error: 'Unauthorized' };
  }

  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from('users')
    .select('role, account_kind, deleted_at')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (
    !account ||
    account.role !== 'super_admin' ||
    account.account_kind !== 'workforce' ||
    account.deleted_at
  ) {
    return { userId: null, role: null, error: 'Forbidden' };
  }

  return { userId: authData.user.id, role: 'super_admin', error: null };
}
