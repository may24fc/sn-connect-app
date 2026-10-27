import { sendTelegramMessage } from '@/lib/telegram';
import { NOTIFICATION_PREFERENCES_ROLE_TYPE, normalizeStoredNotificationPreferences } from '@/lib/settings/notification-preferences';
import { processProjectIntakeMessage } from '@/lib/intake/process-project-intake-message';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { requestUhpVolumePointsTelegramUpdate } from '@/lib/uhp-volume-points-manual-send';
import { NextResponse } from 'next/server';

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    voice?: { file_id?: string; mime_type?: string };
    chat?: { id?: number | string };
    from?: { id?: number; username?: string };
  };
}

interface NotificationPreferenceRow {
  user_id: string;
  metadata: unknown;
  updated_at?: string | null;
}

interface LinkedTelegramUserRow {
  id: string;
  role: string;
}

/** Roles allowed to dispatch project intake from Telegram. */
const INTAKE_ALLOWED_ROLES = new Set(['admin', 'super_admin']);
const ACTIVE_ROLES = new Set(['employee', 'associate', 'admin', 'super_admin']);

function readTelegramCommand(text: string): string {
  return (text.split(/\s+/, 1)[0] ?? '').split('@', 1)[0]?.toLowerCase() ?? '';
}

async function getVolumePointsLinkedUser(telegramUserId?: number) {
  if (!telegramUserId) return null;
  const admin = createSupabaseAdminClient();
  const { data: linkRows, error: linkError } = await admin
    .from('user_role_metadata')
    .select('user_id, metadata, updated_at')
    .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
    .contains('metadata', { telegramChatId: String(telegramUserId) })
    .order('updated_at', { ascending: false })
    .limit(5);
  if (linkError || !linkRows) return null;
  const link = (linkRows as NotificationPreferenceRow[]).find((row) => {
    const preferences = normalizeStoredNotificationPreferences(row.metadata);
    return preferences.telegramChatId === String(telegramUserId);
  });
  if (!link) return null;
  const { data: user } = await admin
    .from('users')
    .select('id, role, status, deleted_at')
    .eq('id', link.user_id)
    .maybeSingle();
  if (
    !user ||
    user.deleted_at ||
    user.status === 'terminated' ||
    user.status === 'inactive' ||
    !ACTIVE_ROLES.has(user.role)
  )
    return null;
  return user as { id: string; role: string };
}

async function handleVolumePointsCommand(update: TelegramUpdate): Promise<boolean> {
  const message = update.message;
  const text = (message?.text ?? '').trim();
  if (readTelegramCommand(text) !== '/vp') return false;
  const chatId = message?.chat?.id;
  if (chatId === undefined || chatId === null) return true;
  const respond = (responseText: string) =>
    sendTelegramMessage({ chatId: String(chatId), text: responseText });
  const sender = await getVolumePointsLinkedUser(message?.from?.id);
  if (!sender) {
    await respond('Link your Telegram account from Control Hub Settings before using /vp.');
    return true;
  }
  if (!INTAKE_ALLOWED_ROLES.has(sender.role)) {
    const admin = createSupabaseAdminClient();
    const { data: grant, error } = await admin
      .from('uhp_access_grants')
      .select('id')
      .eq('user_id', sender.id)
      .eq('module', 'volume_points')
      .is('deleted_at', null)
      .maybeSingle();
    if (error) console.error('[Telegram] Failed to resolve /vp access:', error);
    if (!grant) {
      await respond('Your Control Hub account does not have access to UHP Volume Points.');
      return true;
    }
  }
  const result = await requestUhpVolumePointsTelegramUpdate({
    requestedBy: sender.id,
    source: 'telegram_command',
  });
  if (!result.ok) {
    await respond(
      result.reason === 'not_configured'
        ? 'The UHP Volume Points Telegram workflow is not configured yet.'
        : 'The VP update could not be started right now. Please try again.'
    );
    return true;
  }
  await respond('VP update requested. The latest Volume Points digest is being sent.');
  return true;
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
    const message = update.message;
    const text = (message?.text ?? message?.caption ?? '').trim();
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;
    const voiceFileId = message?.voice?.file_id;

    if (chatId === undefined || chatId === null) {
      return NextResponse.json({ ok: true });
    }

    if (await handleVolumePointsCommand(update)) return NextResponse.json({ ok: true });

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
          text: 'This Telegram linking link is invalid or has already been used. Please return to Control Hub Settings and generate a new one.',
        });
        return NextResponse.json({ ok: true });
      }

      const preferences = normalizeStoredNotificationPreferences(data.metadata);
      if (preferences.telegramLinkToken !== rawToken || !preferences.telegramLinkTokenExpiresAt) {
        await sendTelegramMessage({
          chatId: String(chatId),
          text: 'This Telegram linking link is invalid or has expired. Please request a new link from Control Hub Settings.',
        });
        return NextResponse.json({ ok: true });
      }

      const { error: updateError } = await admin
        .from('user_role_metadata')
        .update({
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
        text: 'Your Telegram account is now linked to this Control Hub account. You can return to Settings to enable Telegram notifications.',
      });

      return NextResponse.json({ ok: true });
    }

    // ----- Project intake from CEO / super_admin / admin -----
    if (!text && !voiceFileId) {
      return NextResponse.json({ ok: true });
    }

    const admin = createSupabaseAdminClient();

    const { data: linkRows, error: linkErr } = await admin
      .from('user_role_metadata')
      .select('user_id, metadata, updated_at')
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
      .contains('metadata', { telegramChatId: String(chatId) })
      .order('updated_at', { ascending: false })
      .limit(5);

    if (linkErr || !linkRows || linkRows.length === 0) {
      // Unknown chat — silently ignore. Avoid leaking that the chat is unlinked.
      return NextResponse.json({ ok: true });
    }

    const matchedLinkRow = (linkRows as NotificationPreferenceRow[]).find((row) => {
      const preferences = normalizeStoredNotificationPreferences(row.metadata);
      return preferences.telegramChatId === String(chatId);
    });

    if (!matchedLinkRow) {
      return NextResponse.json({ ok: true });
    }

    const linkedUserIds = (linkRows as NotificationPreferenceRow[]).map((row) => row.user_id);
    const { data: linkedUsers, error: userErr } = await admin
      .from('users')
      .select('id, role')
      .in('id', linkedUserIds);

    if (userErr || !linkedUsers) {
      return NextResponse.json({ ok: true });
    }

    const roleByUserId = new Map(
      (linkedUsers as LinkedTelegramUserRow[]).map((row) => [row.id, row.role])
    );

    const senderUserId = (linkRows as NotificationPreferenceRow[]).find((row) =>
      INTAKE_ALLOWED_ROLES.has(roleByUserId.get(row.user_id) ?? '')
    )?.user_id;

    if (!senderUserId) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: 'Your Telegram chat is linked, but project intake is only enabled for leadership and admin roles.',
      });
      return NextResponse.json({ ok: true });
    }

    const senderRole = roleByUserId.get(senderUserId);
    if (!senderRole || !INTAKE_ALLOWED_ROLES.has(senderRole)) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: 'Your account is linked, but project intake is only enabled for leadership and admin roles.',
      });
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage({
      chatId: String(chatId),
      text: 'Got it — processing your project request. You will get a confirmation in a moment.',
    });

    const intakePayload = {
      sourceChatId: String(chatId),
      sourceMessageId: String(messageId ?? Date.now()),
      senderUserId,
      text,
      ...(voiceFileId ? { voiceFileId } : {}),
      ...(message?.voice?.mime_type ? { voiceMimeType: message.voice.mime_type } : {}),
    };

    try {
      await inngest.send({
        name: 'project-intake/received',
        data: intakePayload,
      });
    } catch (queueError) {
      console.error('[Telegram] Failed to queue project intake in Inngest, falling back to direct processing:', queueError);

      try {
        await processProjectIntakeMessage({
          sourceChatId: intakePayload.sourceChatId,
          sourceMessageId: intakePayload.sourceMessageId,
          senderUserId: intakePayload.senderUserId,
          text: intakePayload.text,
          ...(intakePayload.voiceFileId ? { voiceFileId: intakePayload.voiceFileId } : {}),
        });
      } catch (fallbackError) {
        console.error('[Telegram] Direct project intake fallback failed:', fallbackError);
        await sendTelegramMessage({
          chatId: String(chatId),
          text: 'We could not process your project request right now. Please try again shortly.',
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}