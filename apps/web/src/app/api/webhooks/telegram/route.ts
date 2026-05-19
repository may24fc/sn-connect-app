import { sendTelegramMessage } from '@/lib/telegram';
import { NOTIFICATION_PREFERENCES_ROLE_TYPE, normalizeStoredNotificationPreferences } from '@/lib/settings/notification-preferences';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { NextResponse } from 'next/server';

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    voice?: { file_id?: string; mime_type?: string };
    chat?: { id?: number | string };
    from?: { username?: string };
  };
}

/** Roles allowed to dispatch project intake from Telegram. */
const INTAKE_ALLOWED_ROLES = new Set(['ceo', 'super_admin', 'admin']);

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
    const message = update.message;
    const text = (message?.text ?? message?.caption ?? '').trim();
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;
    const voiceFileId = message?.voice?.file_id;

    if (chatId === undefined || chatId === null) {
      return NextResponse.json({ ok: true });
    }

    // ----- /start <token> account-linking flow (existing behaviour) -----
    if (text.startsWith('/start')) {
      const [, rawToken] = text.split(/\s+/, 2);
      if (!rawToken) {
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
    }

    // ----- Project intake from CEO / super_admin / admin -----
    if (!text && !voiceFileId) {
      return NextResponse.json({ ok: true });
    }

    const admin = createSupabaseAdminClient();

    const { data: linkRow, error: linkErr } = await admin
      .from('user_role_metadata')
      .select('user_id')
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
      .contains('metadata', { telegramChatId: String(chatId) })
      .maybeSingle();

    if (linkErr || !linkRow) {
      // Unknown chat — silently ignore. Avoid leaking that the chat is unlinked.
      return NextResponse.json({ ok: true });
    }

    const senderUserId = (linkRow as { user_id: string }).user_id;

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('role')
      .eq('id', senderUserId)
      .maybeSingle();

    if (userErr || !userRow || !INTAKE_ALLOWED_ROLES.has((userRow as { role: string }).role)) {
      // Linked user, but not authorised for project intake.
      return NextResponse.json({ ok: true });
    }

    await inngest.send({
      name: 'project-intake/received',
      data: {
        sourceChatId: String(chatId),
        sourceMessageId: String(messageId ?? Date.now()),
        senderUserId,
        text,
        ...(voiceFileId ? { voiceFileId } : {}),
        ...(message?.voice?.mime_type ? { voiceMimeType: message.voice.mime_type } : {}),
      },
    });

    await sendTelegramMessage({
      chatId: String(chatId),
      text: 'Got it — processing your project request. You will get a confirmation in a moment.',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}