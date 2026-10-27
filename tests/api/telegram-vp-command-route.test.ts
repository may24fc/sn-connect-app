import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  linkedUserId: 'user-1' as string | null,
  linkedRole: 'associate',
  hasGrant: true,
  sendTelegramMessage: vi.fn(),
  requestUpdate: vi.fn(),
}));

function queryFor(table: string) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    contains: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => {
      if (table === 'user_role_metadata') {
        return {
          data: mocks.linkedUserId
            ? [{ user_id: mocks.linkedUserId, metadata: { telegramChatId: '456' } }]
            : [],
          error: null,
        };
      }
      return { data: [], error: null };
    }),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => {
      if (table === 'users') {
        return {
          data: mocks.linkedUserId
            ? { id: mocks.linkedUserId, role: mocks.linkedRole, status: 'active', deleted_at: null }
            : null,
          error: null,
        };
      }
      if (table === 'uhp_access_grants') {
        return { data: mocks.hasGrant ? { id: 'grant-1' } : null, error: null };
      }
      return { data: null, error: null };
    }),
  };
  return query;
}

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({ from: (table: string) => queryFor(table) }),
}));
vi.mock('@/lib/telegram', () => ({ sendTelegramMessage: mocks.sendTelegramMessage }));
vi.mock('@/lib/uhp-volume-points-manual-send', () => ({
  requestUhpVolumePointsTelegramUpdate: mocks.requestUpdate,
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn() } }));
vi.mock('@/lib/intake/process-project-intake-message', () => ({
  processProjectIntakeMessage: vi.fn(),
}));
vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(),
  getUserIdsByRoles: vi.fn(),
}));
vi.mock('@/lib/settings/notification-preferences', () => ({
  NOTIFICATION_PREFERENCES_ROLE_TYPE: 'notification_preferences',
  normalizeStoredNotificationPreferences: (metadata: unknown) => metadata,
}));
vi.mock('@/lib/telegram-community', () => ({
  getTelegramCommunityConfig: () => ({ chatId: null }),
  queuePendingTicketDeliveries: vi.fn(),
}));

import { POST } from '../../apps/web/src/app/api/webhooks/telegram/route';

function commandRequest(text = '/vp') {
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: 1,
      message: {
        message_id: 10,
        text,
        chat: { id: 123, type: 'private' },
        from: { id: 456, username: 'tester' },
      },
    }),
  });
}

describe('Telegram /vp command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.linkedUserId = 'user-1';
    mocks.linkedRole = 'associate';
    mocks.hasGrant = true;
    mocks.sendTelegramMessage.mockResolvedValue({ sent: true });
    mocks.requestUpdate.mockResolvedValue({ ok: true });
  });

  it('starts the n8n VP workflow for a linked user with Volume Points access', async () => {
    expect((await POST(commandRequest('/vp@ControlHubBot'))).status).toBe(200);
    expect(mocks.requestUpdate).toHaveBeenCalledWith({
      requestedBy: 'user-1',
      source: 'telegram_command',
    });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('VP update requested') })
    );
  });

  it('rejects a linked user without Volume Points access', async () => {
    mocks.hasGrant = false;

    expect((await POST(commandRequest())).status).toBe(200);
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('does not have access') })
    );
  });

  it('asks an unlinked Telegram user to link their account', async () => {
    mocks.linkedUserId = null;

    expect((await POST(commandRequest())).status).toBe(200);
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Link your Telegram account') })
    );
  });
});
