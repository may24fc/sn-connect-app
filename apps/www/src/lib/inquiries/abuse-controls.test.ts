import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInquiryFingerprint,
  consumeInquiryEmailLimits,
  consumeInquiryIpLimits,
  hashInquiryIdentifier,
} from './abuse-controls';

describe('inquiry abuse controls', () => {
  beforeEach(() => {
    process.env.INQUIRY_ABUSE_SECRET = 'test-only-secret';
  });

  afterEach(() => {
    process.env.INQUIRY_ABUSE_SECRET = '';
  });

  it('HMAC-hashes identifiers without exposing their plaintext', () => {
    const value = 'email:person@example.com';
    const expected = createHmac('sha256', 'test-only-secret').update(value).digest('hex');
    expect(hashInquiryIdentifier(value)).toBe(expected);
    expect(hashInquiryIdentifier(value)).not.toContain('person@example.com');
  });

  it('uses both short and daily IP limits', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null })
      .mockResolvedValueOnce({ data: [{ allowed: false, retry_after_seconds: 90 }], error: null });

    const result = await consumeInquiryIpLimits({ rpc } as never, '203.0.113.10');
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 90 });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.map((call) => call[1].p_scope)).toEqual(['ip_short', 'ip_daily']);
  });

  it('uses both short and daily email limits', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null })
      .mockResolvedValueOnce({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null });

    await expect(
      consumeInquiryEmailLimits({ rpc } as never, 'person@example.com')
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(rpc.mock.calls.map((call) => call[1].p_scope)).toEqual(['email_short', 'email_daily']);
  });

  it('builds a stable fingerprint from normalized duplicate fields', () => {
    const inquiry = {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: null,
      business_unit_id: null,
      subject: 'Support',
      message: 'A sufficiently detailed request.',
    };
    expect(buildInquiryFingerprint(inquiry)).toBe(buildInquiryFingerprint({ ...inquiry }));
  });
});
