import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getAuthedSupabase: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock('@/app/api/notifications/_lib', () => ({
  getAuthedSupabase: mocks.getAuthedSupabase,
  isNotificationAdmin: vi.fn(),
}));

import { GET as getAnalytics } from '@/app/api/dashboard/analytics/route';
import { GET as getPending } from '@/app/api/dashboard/pending/route';
import { GET as getStats } from '@/app/api/dashboard/stats/route';
import { GET as getSuperAdminStats } from '@/app/api/dashboard/super-admin-stats/route';

describe('dashboard API authentication boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('No session'),
        }),
      },
    });
    mocks.getAuthedSupabase.mockResolvedValue({
      user: null,
      role: null,
      error: new Error('No session'),
    });
    mocks.createSupabaseAdminClient.mockReturnValue({});
  });

  it.each([
    [
      'analytics',
      () => getAnalytics(new NextRequest('https://app.example.com/api/dashboard/analytics')),
    ],
    ['pending', () => getPending()],
    ['stats', () => getStats()],
    ['super-admin stats', () => getSuperAdminStats()],
  ])('rejects an unauthenticated request in the %s handler', async (_name, callHandler) => {
    const response = await callHandler();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'Unauthorized' });
  });
});
