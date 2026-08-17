import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const MARKETING_ADMIN_ROLES = ['admin', 'super_admin'];

export type MarketingAuthedContext =
  | {
      ok: true;
      user: { id: string; email?: string | null };
      role: string | null;
      hasAccessGrant: boolean;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getMarketingAuthedContext(): Promise<MarketingAuthedContext> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }

    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }

    if (!role) {
      const { data: roleRow, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (roleError) {
        return { ok: false, status: 500, error: 'Failed to resolve user role' };
      }

      role = roleRow?.role ?? null;
    }

    const hasAccessGrant = await resolveMarketingGrant(supabase, user.id);

    return {
      ok: true,
      user,
      role,
      hasAccessGrant,
      supabase,
      supabaseAdmin: createSupabaseAdminClient(),
    };
  } catch (error) {
    console.error('Failed to resolve marketing auth context:', error);
    return { ok: false, status: 500, error: 'Internal server error' };
  }
}

export function hasMarketingAccess(role: string | null, hasAccessGrant: boolean): boolean {
  return MARKETING_ADMIN_ROLES.includes(role ?? '') || hasAccessGrant;
}

export function isMarketingAdmin(role: string | null): boolean {
  return MARKETING_ADMIN_ROLES.includes(role ?? '');
}

export async function resolveMarketingGrant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('marketing_access_grants')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1);

  if (error) {
    console.error('Failed to resolve marketing grant:', error);
    return false;
  }

  return (data ?? []).length > 0;
}

export async function ensureDefaultMarketingPlatforms(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  createdBy?: string
): Promise<Array<{ id: string; name: string; code: string }>> {
  const defaultPlatforms = [
    { name: 'Meta Ads', code: 'meta' },
    { name: 'Google Ads', code: 'google' },
    { name: 'Email Marketing', code: 'email' },
  ];

  const { data: existingPlatforms, error: existingError } = await admin
    .from('marketing_platforms')
    .select('id, name, code')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (existingError) {
    throw existingError;
  }

  const platformMap = new Map((existingPlatforms ?? []).map((platform) => [platform.code, platform]));
  const nextPlatforms: Array<{ id: string; name: string; code: string }> = existingPlatforms ?? [];

  for (const platform of defaultPlatforms) {
    if (platformMap.has(platform.code)) {
      continue;
    }

    const { data: inserted, error: insertError } = await admin
      .from('marketing_platforms')
      .insert({
        name: platform.name,
        code: platform.code,
        is_active: true,
        created_by: createdBy ?? null,
      })
      .select('id, name, code')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to seed marketing platform:', insertError);
      continue;
    }

    nextPlatforms.push(inserted);
    platformMap.set(platform.code, inserted);
  }

  return nextPlatforms;
}

export async function ensureDefaultCampaignForPlatform(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  platformId: string,
  platformName: string,
  createdBy: string,
  entryDate: string
): Promise<string> {
  const startDate = entryDate ? new Date(`${entryDate}T00:00:00Z`) : new Date();
  const campaignMonth = startDate.toISOString().slice(0, 10);

  const { data: existingCampaign, error: campaignLookupError } = await admin
    .from('marketing_campaigns')
    .select('id')
    .eq('platform_id', platformId)
    .is('deleted_at', null)
    .order('campaign_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (campaignLookupError) {
    console.error('Failed to check default campaign:', campaignLookupError);
  }

  if (existingCampaign?.id) {
    return existingCampaign.id;
  }

  const { data: insertedCampaign, error: campaignInsertError } = await admin
    .from('marketing_campaigns')
    .insert({
      platform_id: platformId,
      name: `Direct Spend - ${platformName}`,
      campaign_month: campaignMonth,
      billing_cycle: 'monthly',
      cap_amount: 0,
      currency: 'AUD',
      status: 'active',
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (campaignInsertError || !insertedCampaign) {
    throw campaignInsertError ?? new Error('Failed to create default campaign');
  }

  logActivity(admin, {
    userId: createdBy,
    action: 'create_default_marketing_campaign',
    tableName: 'marketing_campaigns',
    recordId: insertedCampaign.id,
    metadata: { platformId, platformName },
  });

  return insertedCampaign.id;
}

export function formatMarketingCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function normalizeMarketingPlatformKey(name: string): string {
  const value = name.trim().toLowerCase();

  if (value.includes('meta')) {
    return 'meta';
  }

  if (value.includes('google')) {
    return 'google';
  }

  if (value.includes('email')) {
    return 'email';
  }

  return value.replace(/\s+/g, '-');
}
