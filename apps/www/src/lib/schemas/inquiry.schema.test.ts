import { describe, expect, it } from 'vitest';
import { inquirySchema, normalizeInquiry } from './inquiry.schema';

const validInput = {
  name: '  Jane   Smith ',
  email: ' JANE@EXAMPLE.COM ',
  subject: '  Executive   support ',
  message: '  We need support across several operational tasks.  ',
  form_started_at: Date.now() - 3000,
};

describe('inquirySchema', () => {
  it('normalizes business fields and stores an omitted phone as null', () => {
    const parsed = inquirySchema.parse(validInput);

    expect(normalizeInquiry(parsed)).toEqual({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: null,
      business_unit_id: null,
      subject: 'Executive support',
      message: 'We need support across several operational tasks.',
    });
  });

  it('accepts and preserves a possible E.164 phone number', () => {
    const parsed = inquirySchema.parse({ ...validInput, phone: '+61412345678' });
    expect(normalizeInquiry(parsed).phone).toBe('+61412345678');
  });

  it.each(['hello', '12345', '+61'])('rejects an implausible phone value: %s', (phone) => {
    const result = inquirySchema.safeParse({ ...validInput, phone });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only required fields after trimming', () => {
    const result = inquirySchema.safeParse({
      ...validInput,
      name: '  ',
      subject: '   ',
      message: '          ',
    });
    expect(result.success).toBe(false);
  });
});
