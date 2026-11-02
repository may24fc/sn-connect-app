import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendCommunityTelegramMessage: vi.fn(),
  createTicketRpc: vi.fn(),
  queuePendingTicketDeliveries: vi.fn(),
  communityConfig: {
    chatId: null as string | null,
    generalTopicId: null as number | null,
    helpTopicId: null as number | null,
  },
}));

function queryFor(table: string) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => {
      if (table === 'telegram_account_links') return { data: { user_id: 'admin-1' }, error: null };
      if (table === 'users') {
        return {
          data: { id: 'admin-1', role: 'super_admin', status: 'active', deleted_at: null },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
  };
  return query;
}

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => queryFor(table),
    rpc: mocks.createTicketRpc,
  }),
}));
vi.mock('@/lib/telegram', () => ({
  sendCommunityTelegramMessage: mocks.sendCommunityTelegramMessage,
}));
vi.mock('@/lib/telegram-community', () => ({
  getTelegramCommunityConfig: () => mocks.communityConfig,
  queuePendingTicketDeliveries: mocks.queuePendingTicketDeliveries,
}));
vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(async () => 'Admin User'),
  getUserIdsByRoles: vi.fn(async () => []),
}));

import { handleTelegramCommunityUpdate } from '../../apps/web/src/lib/telegram-community-webhook';

describe('Telegram Community command handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendCommunityTelegramMessage.mockResolvedValue({ sent: true });
    mocks.createTicketRpc.mockResolvedValue({
      data: [{ ticket_id: '11111111-1111-1111-1111-111111111111', created: true }],
      error: null,
    });
    mocks.queuePendingTicketDeliveries.mockResolvedValue(1);
    mocks.communityConfig.chatId = null;
    mocks.communityConfig.generalTopicId = null;
    mocks.communityConfig.helpTopicId = null;
  });

  it('allows a linked super-admin to discover IDs before the chat ID is configured', async () => {
    await handleTelegramCommunityUpdate({
      update_id: 1,
      message: {
        message_id: 25,
        message_thread_id: 7,
        text: '/topicid',
        chat: { id: -1001234567890, type: 'supergroup' },
        from: { id: 456, username: 'admin' },
      },
    });

    expect(mocks.sendCommunityTelegramMessage).toHaveBeenCalledWith({
      chatId: '-1001234567890',
      messageThreadId: 7,
      replyToMessageId: 25,
      text: 'Chat ID: -1001234567890\nTopic ID: 7',
    });
  });

  it('treats a missing thread ID as the renamed default General topic', async () => {
    mocks.communityConfig.chatId = '-1001234567890';

    await handleTelegramCommunityUpdate({
      update_id: 2,
      message: {
        message_id: 26,
        text: '/ticket',
        chat: { id: -1001234567890, type: 'supergroup' },
        from: { id: 456, username: 'admin' },
        reply_to_message: {
          message_id: 24,
          text: 'Add a dashboard filter',
          from: { id: 456, username: 'admin' },
        },
      },
    });

    expect(mocks.createTicketRpc).toHaveBeenCalledWith(
      'create_ticket_from_telegram',
      expect.objectContaining({
        p_category: 'feature_request',
        p_topic_id: undefined,
      })
    );
  });
});
