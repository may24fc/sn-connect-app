import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendInquiryConfirmation, sendInquiryNotification } from './email';

describe('inquiry email delivery', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });
  });

  it('sends a fixed-subject confirmation with only the inquiry topic and ID', async () => {
    const result = await sendInquiryConfirmation({
      inquiryId: 'inquiry-123',
      to: 'person@example.com',
      subject: '<Operations support>',
    });

    expect(result).toEqual({ sent: true, id: 'email_123' });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'We received your quick brief',
        to: 'person@example.com',
        html: expect.stringContaining('&lt;Operations support&gt;'),
      }),
      { idempotencyKey: 'inquiry-confirmation/inquiry-123' }
    );
    const confirmationPayload = sendMock.mock.calls.at(0)?.[0];
    expect(confirmationPayload?.html).toContain('inquiry-123');
  });

  it('escapes the full internal brief and uses an idempotency key', async () => {
    await sendInquiryNotification({
      inquiryId: 'inquiry-456',
      name: '<script>',
      email: 'person@example.com',
      phone: null,
      subject: 'Support',
      message: '<img src=x>',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('&lt;img src=x&gt;'),
      }),
      { idempotencyKey: 'inquiry-internal/inquiry-456' }
    );
    const internalPayload = sendMock.mock.calls.at(0)?.[0];
    expect(internalPayload?.html).not.toContain('<script>');
  });
});
