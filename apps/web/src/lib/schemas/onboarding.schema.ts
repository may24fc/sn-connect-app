import {
  SUPPORTED_COUNTRIES,
  isSupportedPhoneCountryCode,
  validatePhoneNumber,
} from '@/lib/validation/phone';
import { z } from 'zod';

/** Optional email: accepts a valid email, empty string, null, or undefined */
const optionalEmail = z
  .union([z.string().email(), z.literal(''), z.null(), z.undefined()])
  .optional();

/** Optional URL: accepts a valid URL, empty string, null, or undefined */
const optionalUrl = z.union([z.string().url(), z.literal(''), z.null(), z.undefined()]).optional();

/** Optional date string: accepts YYYY-MM-DD, empty string, null, or undefined */
const optionalDate = z
  .union([z.string().date(), z.literal(''), z.null(), z.undefined()])
  .optional();

/** Optional UUID: accepts a valid UUID, empty string, null, or undefined */
const optionalUuid = z
  .union([z.string().uuid(), z.literal(''), z.null(), z.undefined()])
  .optional();

const phoneCountryCodeSchema = z.enum(
  SUPPORTED_COUNTRIES.map((country) => country.code) as [string, ...string[]]
);

const bankSelectionSchema = z
  .union([z.string().uuid(), z.literal('OTHER'), z.literal(''), z.null(), z.undefined()])
  .optional();

function coercePhoneCountryCode(value: string): (typeof SUPPORTED_COUNTRIES)[number]['code'] {
  return isSupportedPhoneCountryCode(value) ? value : 'GLOBAL';
}

/** Phone number validation: supports international formats via libphonenumber-js */
const phoneNumber = z
  .string()
  .min(1, 'Contact number is required');

export const onboardingStepSchema = z.enum([
  'personal_info',
  'payment_info',
  'documents',
  'review',
]);

export const onboardingDocumentTypeSchema = z.enum([
  'valid_id',
  'profile_photo',
  'cv',
  'birth_certificate',
]);

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(120),
  middleName: z.union([z.string().max(120), z.literal(''), z.null(), z.undefined()]).optional(),
  lastName: z.string().min(1, 'Last name is required').max(120),
  position: z.string().min(1, 'Position is required').max(150),
  personalEmail: z
    .string()
    .email('Valid personal email is required')
    .min(1, 'Personal email is required')
    .max(150),
  companyEmail: z
    .string()
    .email('Valid company email is required')
    .min(1, 'Company email is required')
    .max(150),
  departmentId: optionalUuid,
  startDate: optionalDate,
  nationality: z.string().min(1, 'Nationality is required').max(120),
  contactNumber: phoneNumber,
  contactCountryCode: phoneCountryCodeSchema.default('PH'),
  emailAddress: optionalEmail,
  education: z.string().min(1, 'Education level is required').max(300),
  major: z.union([z.string().max(200), z.literal(''), z.null(), z.undefined()]).optional(),
  birthday: z.string().date('Valid birthday is required').min(1, 'Birthday is required'),
  age: z
    .union([z.number().int().min(0).max(120), z.literal(''), z.null(), z.undefined()])
    .optional(),
  address: z.string().min(1, 'Address is required').max(500),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required').max(120),
  emergencyContactNumber: phoneNumber,
  emergencyContactCountryCode: phoneCountryCodeSchema.default('PH'),
  emergencyContactEmail: optionalEmail,
  emergencyContactRelationship: z
    .string()
    .min(1, 'Emergency contact relationship is required')
    .max(80),
  linkedinProfileUrl: optionalUrl,
}).superRefine((data, ctx) => {
  if (!validatePhoneNumber(data.contactNumber, coercePhoneCountryCode(data.contactCountryCode))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactNumber'],
      message: 'Invalid phone number for the selected country.',
    });
  }

  if (
    !validatePhoneNumber(
      data.emergencyContactNumber,
      coercePhoneCountryCode(data.emergencyContactCountryCode)
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['emergencyContactNumber'],
      message: 'Invalid phone number for the selected country.',
    });
  }
});

export const paymentInfoSchema = z.object({
  paymentCountryCode: phoneCountryCodeSchema.default('PH'),
  paymentBankId: bankSelectionSchema,
  paymentBankName: z.union([z.string().max(150), z.literal(''), z.null(), z.undefined()]).optional(),
  paymentAccountName: z.string().min(1, 'Account name is required').max(150),
  paymentAccountNumber: z.string().min(1, 'Account number is required').max(30),
  paymentEmail: z
    .string()
    .email('Valid payment email is required')
    .min(1, 'Payment email is required')
    .max(150),
  paymentPhoneNumber: phoneNumber,
  paymentPhoneCountryCode: phoneCountryCodeSchema.default('PH'),
  paymentAddress: z.string().min(1, 'Address is required').max(500),
  paymentCity: z.string().min(1, 'City is required').max(100),
  paymentProvince: z.string().min(1, 'Province is required').max(100),
  paymentZipcode: z.string().max(20).optional().nullable(),
}).superRefine((data, ctx) => {
  if (
    !validatePhoneNumber(
      data.paymentPhoneNumber,
      coercePhoneCountryCode(data.paymentPhoneCountryCode)
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentPhoneNumber'],
      message: 'Invalid phone number for the selected country.',
    });
  }

  if (data.paymentBankId === 'OTHER' && !String(data.paymentBankName ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentBankName'],
      message: 'Please provide the bank name when selecting Other.',
    });
  }
});

export const documentMetadataSchema = z.object({
  documentType: onboardingDocumentTypeSchema,
  fileName: z.string().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  mimeType: z.string().min(1).max(100),
});

export const documentsSchema = z.object({
  documents: z.array(documentMetadataSchema).max(10).default([]),
});

export const updateOnboardingStepSchema = z.object({
  step: onboardingStepSchema,
  data: z.record(z.unknown()).default({}),
});

export const completeOnboardingSchema = z.object({
  confirm: z.literal(true),
});

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OnboardingDocumentType = z.infer<typeof onboardingDocumentTypeSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type PaymentInfoInput = z.infer<typeof paymentInfoSchema>;
export type DocumentsInput = z.infer<typeof documentsSchema>;
export type UpdateOnboardingStepInput = z.infer<typeof updateOnboardingStepSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
