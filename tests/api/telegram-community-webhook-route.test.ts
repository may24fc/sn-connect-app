import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handleUpdate: vi.fn(),
}));

vi.mock('@/lib/telegram-community-webhook', () => ({
  handleTelegramCommunityUpdate: mocks.handleUpdate,
}));

import { POST } from '../../apps/web/src/app/api/webhooks/telegram-community/route';

function request(secret?: string) {
  return new Request('http://localhost/api/webhooks/telegram-community', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {}),
    },
    body: JSON.stringify({ update_id: 1, message: { text: '/topicid' } }),
  });
}

describe('Telegram Community webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('fails closed when the community webhook secret is missing', async () => {
    expect((await POST(request())).status).toBe(503);
    expect(mocks.handleUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid Telegram secret header', async () => {
    vi.stubEnv('TELEGRAM_COMMUNITY_WEBHOOK_SECRET', 'correct-secret');

    expect((await POST(request('wrong-secret'))).status).toBe(401);
    expect(mocks.handleUpdate).not.toHaveBeenCalled();
  });

  it('dispatches an authorized update', async () => {
    vi.stubEnv('TELEGRAM_COMMUNITY_WEBHOOK_SECRET', 'correct-secret');

    expect((await POST(request('correct-secret'))).status).toBe(200);
    expect(mocks.handleUpdate).toHaveBeenCalledWith(expect.objectContaining({ update_id: 1 }));
  });
});
