import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getActiveUserRole: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/auth/active-role', () => ({
  getActiveUserRole: mocks.getActiveUserRole,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  })),
}));

import { DELETE } from '../../apps/web/src/app/api/users/[id]/notification-preferences/telegram-link/route';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';

function request() {
  return new Request('http://localhost/api/users/me/notification-preferences/telegram-link', {
    method: 'DELETE',
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('Telegram account disconnect route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveUserRole.mockResolvedValue('employee');
    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: {
        telegram: false,
        gmail: true,
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramLinkToken: null,
        telegramLinkTokenExpiresAt: null,
      },
      error: null,
    });
  });

  it('rejects an unauthenticated request', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

    expect((await DELETE(request(), context(userId))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not let an administrator disconnect another account', async () => {
    mocks.getActiveUserRole.mockResolvedValue('super_admin');

    expect((await DELETE(request(), context(otherUserId))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('atomically disconnects the caller and returns reconciled preferences', async () => {
    const response = await DELETE(request(), context(userId));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('disconnect_telegram_account', {
      p_user_id: userId,
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        telegram: false,
        gmail: true,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramLinkPendingUntil: null,
        telegramLinkState: 'unlinked',
      },
    });
  });

  it('does not report success when the transaction fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'database failure' } });

    expect((await DELETE(request(), context(userId))).status).toBe(500);
  });
});
