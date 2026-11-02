import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendCommunityTelegramMessage: vi.fn(),
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
  createSupabaseAdminClient: () => ({ from: (table: string) => queryFor(table) }),
}));
vi.mock('@/lib/telegram', () => ({
  sendCommunityTelegramMessage: mocks.sendCommunityTelegramMessage,
}));
vi.mock('@/lib/telegram-community', () => ({
  getTelegramCommunityConfig: () => ({
    chatId: null,
    generalTopicId: null,
    helpTopicId: null,
  }),
  queuePendingTicketDeliveries: vi.fn(),
}));
vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(),
  getUserIdsByRoles: vi.fn(),
}));

import { handleTelegramCommunityUpdate } from '../../apps/web/src/lib/telegram-community-webhook';

describe('Telegram Community command handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendCommunityTelegramMessage.mockResolvedValue({ sent: true });
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
});
