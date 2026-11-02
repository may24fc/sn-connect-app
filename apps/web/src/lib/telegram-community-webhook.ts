import {
  createNotification,
  getUserDisplayName,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendCommunityTelegramMessage } from '@/lib/telegram';
import { getTelegramCommunityConfig, queuePendingTicketDeliveries } from '@/lib/telegram-community';

export interface TelegramCommunityUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    message_thread_id?: number;
    chat?: { id?: number | string; type?: string };
    from?: { id?: number; username?: string };
    reply_to_message?: {
      message_id?: number;
      text?: string;
      caption?: string;
      from?: { id?: number; username?: string };
    };
  };
}

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const ACTIVE_ROLES = new Set(['employee', 'associate', 'admin', 'super_admin']);

function readTelegramCommand(text: string): string {
  return (text.split(/\s+/, 1)[0] ?? '').split('@', 1)[0]?.toLowerCase() ?? '';
}

async function getLinkedTelegramUser(telegramUserId?: number) {
  if (!telegramUserId) return null;
  const admin = createSupabaseAdminClient();
  const { data: link } = await admin
    .from('telegram_account_links')
    .select('user_id')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();
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

function replyToCommunityMessage(update: TelegramCommunityUpdate, text: string) {
  const message = update.message;
  return sendCommunityTelegramMessage({
    chatId: String(message?.chat?.id),
    text,
    ...(message?.message_thread_id ? { messageThreadId: message.message_thread_id } : {}),
    ...(message?.message_id ? { replyToMessageId: message.message_id } : {}),
  });
}

export async function handleTelegramCommunityUpdate(
  update: TelegramCommunityUpdate
): Promise<void> {
  const message = update.message;
  const text = (message?.text ?? '').trim();
  const chatId = message?.chat?.id;
  if (!message || chatId === undefined || chatId === null || !text.startsWith('/')) return;

  const command = readTelegramCommand(text);
  if (command === '/topicid') {
    const sender = await getLinkedTelegramUser(message?.from?.id);
    if (!sender || !ADMIN_ROLES.has(sender.role)) {
      await replyToCommunityMessage(
        update,
        'Only a linked Control Hub admin or super-admin can inspect forum topic IDs.'
      );
      return;
    }
    if (message.chat?.type !== 'supergroup') {
      await replyToCommunityMessage(update, 'Use /topicid inside the Control Hub Telegram Forum.');
      return;
    }
    await replyToCommunityMessage(
      update,
      `Chat ID: ${chatId}\nTopic ID: ${message.message_thread_id ?? 'none'}`
    );
    return;
  }

  if (command !== '/ticket') return;
  const config = getTelegramCommunityConfig();
  if (!config.chatId || String(chatId) !== config.chatId) return;

  const topicId = message?.message_thread_id;
  const isGeneralTopic =
    topicId === config.generalTopicId || (topicId === undefined && config.generalTopicId === null);
  const category = isGeneralTopic
    ? 'feature_request'
    : topicId === config.helpTopicId
      ? 'bug_report'
      : null;
  const reply = message?.reply_to_message;
  const sourceText = (reply?.text ?? reply?.caption ?? '').trim();
  if (!category) {
    await replyToCommunityMessage(
      update,
      'Use /ticket only in General & Ideas or Help & Bug Report.'
    );
    return;
  }
  if (!reply?.message_id || !sourceText) {
    await replyToCommunityMessage(
      update,
      'Reply /ticket to a text post or a media post with a caption.'
    );
    return;
  }

  const [converter, author] = await Promise.all([
    getLinkedTelegramUser(message?.from?.id),
    getLinkedTelegramUser(reply.from?.id),
  ]);
  if (!converter) {
    await replyToCommunityMessage(
      update,
      'Link your Telegram account from Control Hub Settings before creating a ticket.'
    );
    return;
  }
  if (!author) {
    await replyToCommunityMessage(
      update,
      'The original post author must link Telegram from Control Hub Settings first.'
    );
    return;
  }
  if (converter.id !== author.id && !ADMIN_ROLES.has(converter.role)) {
    await replyToCommunityMessage(
      update,
      'Only the post author or a Control Hub admin can convert this message.'
    );
    return;
  }

  const firstLine =
    sourceText
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? 'Telegram request';
  const title =
    firstLine.length >= 3
      ? firstLine.slice(0, 200)
      : `${category === 'bug_report' ? 'Bug report' : 'Idea'}: ${firstLine}`.slice(0, 200);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('create_ticket_from_telegram', {
    p_submitted_by: author.id,
    p_converted_by: converter.id,
    p_title: title,
    p_description: sourceText,
    p_category: category,
    p_chat_id: Number(chatId),
    p_topic_id: topicId ?? null,
    p_source_message_id: reply.message_id,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result?.ticket_id) {
    console.error('[Telegram Community] Ticket conversion failed:', error);
    await replyToCommunityMessage(
      update,
      'The ticket could not be created right now. Please try again.'
    );
    return;
  }

  const reference = String(result.ticket_id).replaceAll('-', '').slice(0, 8).toUpperCase();
  await replyToCommunityMessage(
    update,
    result.created
      ? `Ticket ${reference} was created. Progress will appear in Ticket Progress Feed.`
      : `This post is already ticket ${reference}.`
  );
  if (!result.created) return;

  queuePendingTicketDeliveries(result.ticket_id).catch((queueError) =>
    console.error('[Telegram Community] Failed to queue ticket delivery:', queueError)
  );
  const [submitterName, superAdminIds] = await Promise.all([
    getUserDisplayName(author.id),
    getUserIdsByRoles(['super_admin']),
  ]);
  for (const superAdminId of superAdminIds) {
    createNotification({
      userId: superAdminId,
      type: 'system',
      title: 'New Telegram support ticket',
      message: `${submitterName} submitted an IT ticket from the community forum: "${title}"`,
      link: '/super-admin/tickets',
      metadata: { ticketId: result.ticket_id, team: 'it', source: 'telegram_forum' },
    });
  }
}
