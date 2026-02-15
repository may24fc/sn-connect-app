import { describe, expect, it } from 'vitest';
import {
  completeOnboardingSchema,
  documentsSchema,
  paymentInfoSchema,
  personalInfoSchema,
} from '../../apps/web/src/lib/schemas/onboarding.schema';

describe('onboarding schemas', () => {
  it('validates personal info payload', () => {
    const parsed = personalInfoSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      position: 'Software Engineer',
      emailAddress: 'jane@example.com',
    });

    expect(parsed.success).toBe(true);
  });

  it('requires payment account fields', () => {
    const parsed = paymentInfoSchema.safeParse({
      paymentAccountName: '',
      paymentAccountNumber: '',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts document metadata list', () => {
    const parsed = documentsSchema.safeParse({
      documents: [
        {
          documentType: 'valid_id',
          fileName: 'id.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('requires explicit confirmation for completion', () => {
    const valid = completeOnboardingSchema.safeParse({ confirm: true });
    const invalid = completeOnboardingSchema.safeParse({ confirm: false });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
