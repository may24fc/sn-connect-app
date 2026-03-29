import { describe, expect, it } from 'vitest';
import {
  completeOnboardingSchema,
  documentsSchema,
  paymentInfoSchema,
  personalInfoSchema,
} from '../../apps/web/src/lib/schemas/onboarding.schema';

const validPersonalInfo = {
  firstName: 'Jane',
  middleName: '',
  lastName: 'Doe',
  position: 'Software Engineer',
  personalEmail: 'jane.personal@example.com',
  companyEmail: 'jane.doe@company.com',
  departmentId: null,
  startDate: null,
  nationality: 'Filipino',
  contactNumber: '9171234567',
  contactCountryCode: 'PH',
  emailAddress: 'jane@example.com',
  education: "Bachelor's Degree",
  major: 'Computer Science',
  birthday: '1995-05-15',
  age: 30,
  address: '123 Main Street',
  emergencyContactName: 'John Doe',
  emergencyContactNumber: '9177654321',
  emergencyContactCountryCode: 'PH',
  emergencyContactEmail: 'john.doe@example.com',
  emergencyContactRelationship: 'Sibling',
  linkedinProfileUrl: 'https://linkedin.com/in/jane-doe',
} as const;

const validPaymentInfo = {
  paymentCountryCode: 'PH',
  paymentBankId: 'OTHER',
  paymentBankName: 'Sample Bank',
  paymentAccountName: 'Jane Doe',
  paymentAccountNumber: '1234567890',
  paymentEmail: 'payments@example.com',
  paymentPhoneNumber: '9171234567',
  paymentPhoneCountryCode: 'PH',
  paymentAddress: '123 Main Street',
  paymentCity: 'Makati',
  paymentProvince: 'Metro Manila',
  paymentZipcode: '1200',
} as const;

function getIssuePaths(result: ReturnType<typeof personalInfoSchema.safeParse> | ReturnType<typeof paymentInfoSchema.safeParse>): string[] {
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('onboarding schemas', () => {
  it('accepts a complete personal info payload', () => {
    const parsed = personalInfoSchema.safeParse(validPersonalInfo);

    expect(parsed.success).toBe(true);
  });

  it('accepts a complete payment info payload', () => {
    const parsed = paymentInfoSchema.safeParse(validPaymentInfo);

    expect(parsed.success).toBe(true);
  });

  it.each([
    'firstName',
    'lastName',
    'position',
    'personalEmail',
    'companyEmail',
    'nationality',
    'contactNumber',
    'education',
    'birthday',
    'address',
    'emergencyContactName',
    'emergencyContactNumber',
    'emergencyContactRelationship',
  ])('requires personal info field %s', (fieldName) => {
    const parsed = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      [fieldName]: '',
    });

    expect(parsed.success).toBe(false);
    expect(getIssuePaths(parsed)).toContain(fieldName);
  });

  it.each([
    'paymentAccountName',
    'paymentAccountNumber',
    'paymentEmail',
    'paymentPhoneNumber',
    'paymentAddress',
    'paymentCity',
    'paymentProvince',
  ])('requires payment info field %s', (fieldName) => {
    const parsed = paymentInfoSchema.safeParse({
      ...validPaymentInfo,
      [fieldName]: '',
    });

    expect(parsed.success).toBe(false);
    expect(getIssuePaths(parsed)).toContain(fieldName);
  });

  it('rejects invalid personal and emergency email formats when provided', () => {
    const invalidPersonal = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      personalEmail: 'invalid-email',
    });
    const invalidEmergency = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      emergencyContactEmail: 'not-an-email',
    });

    expect(invalidPersonal.success).toBe(false);
    expect(getIssuePaths(invalidPersonal)).toContain('personalEmail');
    expect(invalidEmergency.success).toBe(false);
    expect(getIssuePaths(invalidEmergency)).toContain('emergencyContactEmail');
  });

  it('rejects invalid payment email format', () => {
    const parsed = paymentInfoSchema.safeParse({
      ...validPaymentInfo,
      paymentEmail: 'invalid-email',
    });

    expect(parsed.success).toBe(false);
    expect(getIssuePaths(parsed)).toContain('paymentEmail');
  });

  it('rejects invalid personal, emergency, and payment phone numbers', () => {
    const invalidPersonal = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      contactNumber: '123',
    });
    const invalidEmergency = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      emergencyContactNumber: '456',
    });
    const invalidPayment = paymentInfoSchema.safeParse({
      ...validPaymentInfo,
      paymentPhoneNumber: '789',
    });

    expect(invalidPersonal.success).toBe(false);
    expect(getIssuePaths(invalidPersonal)).toContain('contactNumber');
    expect(invalidEmergency.success).toBe(false);
    expect(getIssuePaths(invalidEmergency)).toContain('emergencyContactNumber');
    expect(invalidPayment.success).toBe(false);
    expect(getIssuePaths(invalidPayment)).toContain('paymentPhoneNumber');
  });

  it('allows optional text fields to be omitted or blank', () => {
    const parsed = personalInfoSchema.safeParse({
      ...validPersonalInfo,
      middleName: '',
      major: '',
      emailAddress: '',
      emergencyContactEmail: '',
      linkedinProfileUrl: '',
    });

    expect(parsed.success).toBe(true);
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
