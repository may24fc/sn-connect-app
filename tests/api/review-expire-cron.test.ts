import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isReviewEnvironment = vi.hoisted(() => vi.fn());
const createSupabaseAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/environment', () => ({ isReviewEnvironment }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseAdminClient }));

import { GET, POST } from '../../apps/web/src/app/api/cron/review-expire/route';

function request(method: 'GET' | 'POST', authorization?: string) {
  return new NextRequest('http://localhost/api/cron/review-expire', {
    method,
    headers: authorization ? { authorization } : {},
  });
}

function mockAdmin(expired: Array<{ id: string; reviewer_user_id: string }>) {
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const eqUpdate = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const lte = vi.fn().mockResolvedValue({ data: expired, error: null });
  const eqSelect = vi.fn(() => ({ lte }));
  const select = vi.fn(() => ({ eq: eqSelect }));
  createSupabaseAdminClient.mockReturnValue({
    from: vi.fn(() => ({ select, update })),
    auth: { admin: { updateUserById } },
  });
  return { updateUserById, update };
}

describe('review-expire cron', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    isReviewEnvironment.mockReturnValue(true);
  });

  it('is unavailable outside the review environment', async () => {
    isReviewEnvironment.mockReturnValue(false);
    expect((await GET(request('GET', 'Bearer test-secret'))).status).toBe(404);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('rejects requests without the cron secret', async () => {
    expect((await GET(request('GET'))).status).toBe(401);
    expect((await GET(request('GET', 'Bearer wrong'))).status).toBe(401);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('expires engagements and bans reviewers for the GET request Vercel Cron sends', async () => {
    const admin = mockAdmin([{ id: 'engagement-1', reviewer_user_id: 'reviewer-1' }]);
    const response = await GET(request('GET', 'Bearer test-secret'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 1 });
    expect(admin.updateUserById).toHaveBeenCalledWith('reviewer-1', { ban_duration: '876000h' });
    expect(admin.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'expired' }));
  });

  it('keeps POST working for manual invocation', async () => {
    mockAdmin([]);
    const response = await POST(request('POST', 'Bearer test-secret'));
    expect(await response.json()).toEqual({ expired: 0 });
  });
});
