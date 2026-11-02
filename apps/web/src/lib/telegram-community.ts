import { inngest } from '@/lib/inngest/client';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendCommunityTelegramMessage } from '@/lib/telegram';

export const COMMUNITY_TOPIC_ENV = {
  general: 'TELEGRAM_GENERAL_IDEAS_TOPIC_ID',
  help: 'TELEGRAM_HELP_BUG_TOPIC_ID',
  progress: 'TELEGRAM_TICKET_PROGRESS_TOPIC_ID',
  highlights: 'TELEGRAM_COMMUNITY_HIGHLIGHTS_TOPIC_ID',
} as const;

export function getTelegramCommunityConfig() {
  const chatId = process.env.TELEGRAM_COMMUNITY_CHAT_ID?.trim();
  const numberFromEnv = (key: string) => {
    const value = Number(process.env[key]);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  };
  return {
    chatId: chatId || null,
    generalTopicId: numberFromEnv(COMMUNITY_TOPIC_ENV.general),
    helpTopicId: numberFromEnv(COMMUNITY_TOPIC_ENV.help),
    progressTopicId: numberFromEnv(COMMUNITY_TOPIC_ENV.progress),
    highlightsTopicId: numberFromEnv(COMMUNITY_TOPIC_ENV.highlights),
  };
}

export async function queuePendingTicketDeliveries(ticketId?: string) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from('telegram_ticket_delivery_events')
    .select('id')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 8)
    .order('created_at', { ascending: true })
    .limit(50);
  if (ticketId) query = query.eq('ticket_id', ticketId);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;
  await inngest.send(
    data.map((row) => ({
      name: 'telegram/ticket-delivery.requested' as const,
      data: { deliveryEventId: row.id },
    }))
  );
  return data.length;
}

export async function deliverTicketEvent(deliveryEventId: string) {
  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from('telegram_ticket_delivery_events')
    .select('*')
    .eq('id', deliveryEventId)
    .maybeSingle();
  if (!event || event.status === 'sent') return { skipped: true };

  const config = getTelegramCommunityConfig();
  if (!config.chatId || !config.progressTopicId)
    throw new Error('Telegram ticket feed is not configured');

  const payload = event.payload as Record<string, string | null>;
  const labels: Record<string, string> = {
    created: 'Created',
    assigned: 'Assigned',
    in_progress: 'In progress',
    waiting_on_user: 'Waiting on user',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  const { data: claimed } = await admin
    .from('telegram_ticket_delivery_events')
    .update({
      status: 'sending',
      attempts: Number(event.attempts ?? 0) + 1,
      last_error: null,
    })
    .eq('id', event.id)
    .in('status', ['pending', 'failed'])
    .select('id')
    .maybeSingle();
  if (!claimed) return { skipped: true };

  const result = await sendCommunityTelegramMessage({
    chatId: config.chatId,
    messageThreadId: config.progressTopicId,
    text: [
      `🎫 Ticket ${payload.reference ?? ''} — ${labels[event.event_type] ?? event.event_type}`,
      payload.title ?? 'Untitled ticket',
      `Category: ${(payload.category ?? 'other_it').replaceAll('_', ' ')}`,
      payload.featureArea ? `Area: ${payload.featureArea.replaceAll('_', ' ')}` : null,
      `Updated: ${new Date(payload.occurredAt ?? event.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
    ]
      .filter(Boolean)
      .join('\n'),
  });
  if (!result.sent) {
    await admin
      .from('telegram_ticket_delivery_events')
      .update({ status: 'failed', last_error: result.error ?? 'Unknown Telegram error' })
      .eq('id', event.id);
    throw new Error(result.error ?? 'Telegram delivery failed');
  }
  await admin
    .from('telegram_ticket_delivery_events')
    .update({
      status: 'sent',
      telegram_message_id: result.messageId ?? null,
      sent_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', event.id);
  return { sent: true };
}
