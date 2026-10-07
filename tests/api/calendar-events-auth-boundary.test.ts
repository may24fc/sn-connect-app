import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock('@/lib/notifications/create-notification', () => ({
  createCompanyCalendarNotifications: vi.fn(),
}));

import { GET } from '@/app/api/calendar/events/route';

const request = () => new NextRequest('https://app.example.com/api/calendar/events');

describe('calendar events API authentication boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_CALENDAR_ID', '');
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated requests before touching Google or the admin client', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('serves signed-in users with a private cache policy', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
    await expect(response.json()).resolves.toEqual({ configured: false, data: [] });
  });
});
