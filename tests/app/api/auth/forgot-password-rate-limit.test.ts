import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateLink, insert, lookup, query } = vi.hoisted(() => ({
  generateLink: vi.fn(),
  insert: vi.fn(),
  lookup: { count: 0, error: null as { message: string } | null },
  query: { eq: vi.fn(), gte: vi.fn() },
}));
query.eq.mockReturnValue(query);
query.gte.mockImplementation(async () => lookup);

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ select: () => query, insert }),
    auth: { admin: { generateLink } },
  }),
}));
vi.mock('@/lib/auth/redirect-config', () => ({
  getPasswordResetRedirectUrl: () => 'http://localhost:3001/reset-password',
}));

import { POST } from '../../../../apps/web/src/app/api/auth/forgot-password/route';

function request() {
  return new Request('http://localhost:3001/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' }),
  });
}

describe('password reset audit rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookup.count = 0;
    lookup.error = null;
    query.eq.mockReturnValue(query);
    query.gte.mockImplementation(async () => lookup);
    insert.mockResolvedValue({ error: null });
    generateLink.mockResolvedValue({ data: null, error: null });
  });

  it('records an opaque attempt before generating a link', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'auth', operation: 'INSERT', action: 'password_reset_request',
      record_id: expect.stringMatching(/^[a-f0-9-]{36}$/),
    }));
    expect(insert.mock.calls[0]?.[0]).not.toHaveProperty('email');
    expect(generateLink).toHaveBeenCalledOnce();
  });

  it('does not generate a link when the limit is reached or audit fails', async () => {
    lookup.count = 3;
    expect((await POST(request())).status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();

    lookup.count = 0;
    insert.mockResolvedValue({ error: { message: 'unavailable' } });
    expect((await POST(request())).status).toBe(200);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it('does not generate a link when audit lookup fails', async () => {
    lookup.error = { message: 'unavailable' };
    expect((await POST(request())).status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
  });
});
