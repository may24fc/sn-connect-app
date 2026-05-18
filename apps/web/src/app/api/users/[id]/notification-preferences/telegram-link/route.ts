import { createTelegramLinkToken, getStoredNotificationPreferencesForUser, buildTelegramStartUrl } from '@/lib/settings/notification-preferences.server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NOTIFICATION_PREFERENCES_ROLE_TYPE, toClientNotificationPreferences } from '@/lib/settings/notification-preferences';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'ceo', 'cos'];
const TELEGRAM_LINK_TTL_MS = 15 * 60 * 1000;

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  return data?.role ?? null;
}

async function authorizeTargetUser(targetUserId: string): Promise<
  | { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.id !== targetUserId) {
    let role = user.app_metadata?.db_role as string | undefined;
    if (!role) {
      role = (await getUserRole(supabase, user.id)) ?? undefined;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  return { supabase };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const authorized = await authorizeTargetUser(targetUserId);

    if ('response' in authorized) {
      return authorized.response;
    }

    const connectToken = createTelegramLinkToken();
    const connectUrl = buildTelegramStartUrl(connectToken);

    if (!connectUrl) {
      return NextResponse.json(
        { error: 'Telegram is not configured', details: 'TELEGRAM_BOT_USERNAME is missing.' },
        { status: 503 }
      );
    }

    const existingPreferences = await getStoredNotificationPreferencesForUser(targetUserId);
    const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MS).toISOString();
    const { supabase } = authorized;
    const nextMetadata = {
      ...existingPreferences,
      telegramLinkToken: connectToken,
      telegramLinkTokenExpiresAt: expiresAt,
    };

    const { data, error } = await supabase.from('user_role_metadata').upsert(
      {
        user_id: targetUserId,
        role_type: NOTIFICATION_PREFERENCES_ROLE_TYPE,
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,role_type' }
    );

    if (error) {
      return NextResponse.json({ error: 'Failed to create Telegram link token' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        connectUrl,
        expiresAt,
        preferences: toClientNotificationPreferences(data?.metadata ?? nextMetadata),
      },
    });
  } catch (error) {
    console.error('Error creating Telegram link token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}