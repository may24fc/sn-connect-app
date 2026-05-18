import { sendTelegramMessage } from '@/lib/telegram';
import { NOTIFICATION_PREFERENCES_ROLE_TYPE, normalizeStoredNotificationPreferences } from '@/lib/settings/notification-preferences';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { username?: string };
  };
}

function isAuthorizedWebhook(secretHeader: string | null): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    return true;
  }

  return secretHeader === expectedSecret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedWebhook(request.headers.get('x-telegram-bot-api-secret-token'))) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const text = update.message?.text?.trim();
    const chatId = update.message?.chat?.id;

    if (!text || chatId === undefined || chatId === null) {
      return NextResponse.json({ ok: true });
    }

    const [command, rawToken] = text.split(/\s+/, 2);
    if (command !== '/start' || !rawToken) {
      return NextResponse.json({ ok: true });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('user_role_metadata')
      .select('user_id, metadata')
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
      .contains('metadata', { telegramLinkToken: rawToken })
      .maybeSingle();

    if (error || !data) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: 'This Telegram linking link is invalid or has already been used. Please return to SN Connect Settings and generate a new one.',
      });
      return NextResponse.json({ ok: true });
    }

    const preferences = normalizeStoredNotificationPreferences(data.metadata);
    if (preferences.telegramLinkToken !== rawToken || !preferences.telegramLinkTokenExpiresAt) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: 'This Telegram linking link is invalid or has expired. Please request a new link from SN Connect Settings.',
      });
      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await admin.from('user_role_metadata').update({
      metadata: {
        ...preferences,
        telegramChatId: String(chatId),
        telegramUsername: update.message?.from?.username?.trim() || null,
        telegramLinkedAt: new Date().toISOString(),
        telegramLinkToken: null,
        telegramLinkTokenExpiresAt: null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.user_id)
    .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE);

    if (updateError) {
      console.error('[Telegram] Failed to persist linked Telegram chat:', updateError);
      return NextResponse.json({ error: 'Failed to link Telegram account' }, { status: 500 });
    }

    await sendTelegramMessage({
      chatId: String(chatId),
      text: 'Your Telegram account is now linked to SN Connect. You can return to Settings to enable Telegram notifications.',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}