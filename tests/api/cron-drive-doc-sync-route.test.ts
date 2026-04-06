import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, sendMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(() => ({})),
    },
    drive: vi.fn(() => ({
      files: {
        get: getMock,
      },
    })),
  },
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: sendMock,
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { GET } from '@/app/api/cron/drive-doc-sync/route';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

describe('/api/cron/drive-doc-sync route', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'cron-secret';
    process.env.GOOGLE_DRIVE_WATCH_FILE_IDS = 'file-a,file-b,file-c';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'service@example.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';

    const sourceRows: Record<string, { data: unknown }> = {
      'file-a': { data: null },
      'file-b': {
        data: {
          id: 'source-b',
          processing_status: 'ready',
          metadata: {
            google_drive_file_id: 'file-b',
            google_drive_modified_time: '2026-04-06T06:00:00.000Z',
          },
        },
      },
      'file-c': {
        data: {
          id: 'source-c',
          processing_status: 'ready',
          metadata: {
            google_drive_file_id: 'file-c',
            google_drive_modified_time: '2026-04-05T06:00:00.000Z',
          },
        },
      },
    };

    let selectedFileId = '';
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => {
            if (column === 'metadata->>google_drive_file_id') {
              selectedFileId = value;
            }

            return {
              is: vi.fn(() => ({
                maybeSingle: vi.fn(async () => sourceRows[selectedFileId] ?? { data: null }),
              })),
            };
          }),
        })),
      })),
    } as never);

    getMock.mockImplementation(async ({ fileId }: { fileId: string }) => ({
      data: {
        id: fileId,
        name: `Doc ${fileId}`,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime:
          fileId === 'file-c' ? '2026-04-06T09:30:00.000Z' : '2026-04-06T06:00:00.000Z',
      },
    }));
    sendMock.mockResolvedValue(undefined);
  });

  it('returns 401 when the request is not authorized', async () => {
    const response = await GET(new Request('http://localhost/api/cron/drive-doc-sync') as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('queues missing or stale docs and skips docs that are already current', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/drive-doc-sync', {
        headers: {
          authorization: 'Bearer cron-secret',
        },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'drive/document.updated',
        data: expect.objectContaining({
          fileId: 'file-a',
          resourceState: 'poll',
          channelId: 'cron',
        }),
      }),
    );
    expect(sendMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'drive/document.updated',
        data: expect.objectContaining({
          fileId: 'file-c',
          resourceState: 'poll',
        }),
      }),
    );

    const json = await response.json();
    expect(json.queuedCount).toBe(2);
    expect(json.skippedCount).toBe(1);
    expect(json.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileId: 'file-a', action: 'queued', reason: 'missing_source' }),
        expect.objectContaining({ fileId: 'file-b', action: 'skipped', reason: 'up_to_date' }),
        expect.objectContaining({ fileId: 'file-c', action: 'queued', reason: 'outdated_source' }),
      ]),
    );
  });
});