import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  sendInternal: vi.fn(),
  sendConfirmation: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}));

vi.mock('@/lib/email', () => ({
  sendInquiryNotification: mocks.sendInternal,
  sendInquiryConfirmation: mocks.sendConfirmation,
}));

import { POST } from './route';

function createRequest(
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost:3000/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      name: '  Jane   Smith ',
      email: ' JANE@EXAMPLE.COM ',
      phone: '+61412345678',
      subject: '  Operations   support ',
      message: '  We need help with several operational responsibilities. ',
      company_website: '',
      form_started_at: Date.now() - 3000,
      ...overrides,
    }),
  });
}

function allowRpcCalls(): void {
  mocks.rpc.mockImplementation((name: string) => {
    if (name === 'consume_inquiry_rate_limit') {
      return Promise.resolve({
        data: [{ allowed: true, retry_after_seconds: 0 }],
        error: null,
      });
    }
    if (name === 'claim_inquiry_deduplication_key') {
      return Promise.resolve({ data: true, error: null });
    }
    if (name === 'release_inquiry_deduplication_key') {
      return Promise.resolve({ data: null, error: null });
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
}

describe('POST /api/inquiries', () => {
  beforeEach(() => {
    process.env.INQUIRY_ABUSE_SECRET = 'test-only-secret';
    process.env.VERCEL = '';

    allowRpcCalls();
    mocks.single.mockResolvedValue({ data: { id: 'inquiry-123' }, error: null });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update });
    mocks.sendInternal.mockResolvedValue({ sent: true, id: 'internal-1' });
    mocks.sendConfirmation.mockResolvedValue({ sent: true, id: 'confirmation-1' });
  });

  it('normalizes, stores, emails, and records delivery results', async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+61412345678',
        subject: 'Operations support',
        internal_email_status: 'pending',
        confirmation_email_status: 'pending',
      })
    );
    expect(mocks.sendConfirmation).toHaveBeenCalledWith({
      inquiryId: 'inquiry-123',
      to: 'jane@example.com',
      subject: 'Operations support',
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        internal_email_status: 'sent',
        internal_email_resend_id: 'internal-1',
        confirmation_email_status: 'sent',
        confirmation_email_resend_id: 'confirmation-1',
      })
    );
  });

  it('returns 429 with Retry-After when an IP limit is reached', async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: [{ allowed: false, retry_after_seconds: 75 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ allowed: true, retry_after_seconds: 0 }],
        error: null,
      });

    const response = await POST(createRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('75');
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.sendInternal).not.toHaveBeenCalled();
  });

  it('fails closed when the centralized abuse guard fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC unavailable' } });

    const response = await POST(createRequest());
    expect(response.status).toBe(503);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each([
    ['honeypot', { company_website: 'https://spam.example' }],
    ['missing timestamp', { form_started_at: undefined }],
    ['too fast', { form_started_at: Date.now() }],
  ])('silently suppresses %s submissions', async (_label, overrides) => {
    const response = await POST(createRequest(overrides));

    expect(response.status).toBe(201);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.sendInternal).not.toHaveBeenCalled();
  });

  it('silently suppresses a duplicate claim', async () => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'consume_inquiry_rate_limit') {
        return Promise.resolve({
          data: [{ allowed: true, retry_after_seconds: 0 }],
          error: null,
        });
      }
      if (name === 'claim_inquiry_deduplication_key') {
        return Promise.resolve({ data: false, error: null });
      }
      throw new Error(`Unexpected RPC ${name}`);
    });

    const response = await POST(createRequest());
    expect(response.status).toBe(201);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('releases the duplicate claim when persistence fails', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

    const response = await POST(createRequest());
    expect(response.status).toBe(500);
    expect(mocks.rpc).toHaveBeenCalledWith('release_inquiry_deduplication_key', {
      p_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(mocks.sendInternal).not.toHaveBeenCalled();
  });

  it('accepts a stored inquiry and records a Resend failure', async () => {
    mocks.sendConfirmation.mockResolvedValue({ sent: false, error: 'provider unavailable' });

    const response = await POST(createRequest());
    expect(response.status).toBe(201);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmation_email_status: 'failed',
        confirmation_email_resend_id: null,
        confirmation_email_error: 'provider unavailable',
      })
    );
  });

  it('rejects a non-JSON content type before consuming limits', async () => {
    const request = new NextRequest('http://localhost:3000/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });
    const response = await POST(request);
    expect(response.status).toBe(415);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
