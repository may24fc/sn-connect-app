import {
  DEFAULT_STORED_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferencesUpdate,
  normalizeStoredNotificationPreferences,
  NOTIFICATION_PREFERENCES_ROLE_TYPE,
  toClientNotificationPreferences,
} from '@/lib/settings/notification-preferences';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'ceo', 'cos'];

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<string | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  return userData?.role ?? null;
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

  const isSelf = user.id === targetUserId;
  if (!isSelf) {
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const authorized = await authorizeTargetUser(targetUserId);

    if ('response' in authorized) {
      return authorized.response;
    }

    const { supabase } = authorized;
    const { data, error } = await supabase
      .from('user_role_metadata')
      .select('metadata')
      .eq('user_id', targetUserId)
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data?.metadata
        ? toClientNotificationPreferences(data.metadata)
        : toClientNotificationPreferences(DEFAULT_STORED_NOTIFICATION_PREFERENCES),
    });
  } catch (error) {
    console.error('Error loading notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const authorized = await authorizeTargetUser(targetUserId);

    if ('response' in authorized) {
      return authorized.response;
    }

    const body = await request.json();
    const preferenceUpdate = normalizeNotificationPreferencesUpdate(body);

    if (!preferenceUpdate) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: 'telegram and gmail are required boolean fields',
        },
        { status: 400 }
      );
    }

    const { supabase } = authorized;
    const { data: existing } = await supabase
      .from('user_role_metadata')
      .select('metadata')
      .eq('user_id', targetUserId)
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
      .maybeSingle();

    const mergedPreferences = {
      ...normalizeStoredNotificationPreferences(existing?.metadata),
      ...preferenceUpdate,
    };

    const { data, error } = await supabase
      .from('user_role_metadata')
      .upsert(
        {
          user_id: targetUserId,
          role_type: NOTIFICATION_PREFERENCES_ROLE_TYPE,
          metadata: mergedPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role_type' }
      )
      .select('metadata')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: toClientNotificationPreferences(data?.metadata) });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}