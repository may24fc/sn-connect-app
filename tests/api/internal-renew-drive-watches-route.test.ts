import { beforeEach, describe, expect, it, vi } from 'vitest';

const watchMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(() => ({})),
    },
    drive: vi.fn(() => ({
      files: {
        watch: watchMock,
      },
    })),
  },
}));

import { GET } from '@/app/api/internal/renew-drive-watches/route';

describe('/api/internal/renew-drive-watches route', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GOOGLE_DRIVE_WATCH_RENEW_SECRET = 'renew-secret';
    process.env.GOOGLE_DRIVE_WATCH_FILE_IDS = 'file-a,file-b';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'service@example.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
    process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN = 'drive-token';
    process.env.WEBHOOK_BASE_URL = 'https://app.sngroup.com.au';
  });

  it('returns 401 when the bearer token is missing', async () => {
    const response = await GET(new Request('http://localhost/api/internal/renew-drive-watches') as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('renews configured Drive watches with the production webhook URL', async () => {
    watchMock
      .mockResolvedValueOnce({ data: { id: 'channel-a', resourceId: 'resource-a', expiration: String(Date.now() + 1000) } })
      .mockResolvedValueOnce({ data: { id: 'channel-b', resourceId: 'resource-b', expiration: String(Date.now() + 2000) } });

    const response = await GET(
      new Request('http://localhost/api/internal/renew-drive-watches?hours=24', {
        headers: { authorization: 'Bearer renew-secret' },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(watchMock).toHaveBeenCalledTimes(2);
    expect(watchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fileId: 'file-a',
        requestBody: expect.objectContaining({
          address: 'https://app.sngroup.com.au/api/webhooks/drive',
          token: 'drive-token',
          type: 'web_hook',
        }),
      }),
    );
    expect(watchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fileId: 'file-b',
        requestBody: expect.objectContaining({
          address: 'https://app.sngroup.com.au/api/webhooks/drive',
        }),
      }),
    );

    const json = await response.json();
    expect(json.watchesRegistered).toBe(2);
    expect(json.expirationHours).toBe(24);
    expect(json.results).toHaveLength(2);
  });
});