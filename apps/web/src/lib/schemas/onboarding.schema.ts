import { z } from 'zod';

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
  firstName: z.string().min(1).max(120),
  middleName: z.string().max(120).optional().nullable(),
  lastName: z.string().min(1).max(120),
  position: z.string().min(1).max(150),
  departmentId: z.string().uuid().optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  nationality: z.string().max(120).optional().nullable(),
  contactNumber: z.string().max(30).optional().nullable(),
  emailAddress: z.string().email().optional().nullable(),
  education: z.string().max(300).optional().nullable(),
  birthday: z.string().date().optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactNumber: z.string().max(30).optional().nullable(),
  emergencyContactRelationship: z.string().max(80).optional().nullable(),
  linkedinProfileUrl: z.string().url().optional().nullable(),
});

export const paymentInfoSchema = z.object({
  paymentAccountName: z.string().min(1).max(150),
  paymentAccountNumber: z.string().min(4).max(64),
  paymentEmail: z.string().email().optional().nullable(),
  paymentPhoneNumber: z.string().max(30).optional().nullable(),
  paymentAddress: z.string().max(500).optional().nullable(),
  paymentCity: z.string().max(100).optional().nullable(),
  paymentProvince: z.string().max(100).optional().nullable(),
  paymentZipcode: z.string().max(20).optional().nullable(),
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
