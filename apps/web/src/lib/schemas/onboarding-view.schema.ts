import { z } from 'zod';

const onboardingReviewStateSchema = z.enum([
  'in_progress',
  'awaiting_review',
  'rejected',
  'approved',
]);

export const onboardingProfileViewSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  emailAddress: z.string().email().nullable(),
  role: z.enum(['employee', 'associate']).nullable(),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  status: z.enum(['completed', 'in_progress']),
  reviewState: onboardingReviewStateSchema,
  rejectionNotes: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectedBy: z.string().uuid().nullable(),
  rejectionCount: z.number().int().nonnegative(),
  currentStep: z.enum(['personal_info', 'payment_info', 'documents', 'review']),
  startDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  paymentAccountMasked: z.string().nullable(),
});

export const onboardingDocumentViewSchema = z.object({
  id: z.string().uuid(),
  onboardingProfileId: z.string().uuid(),
  documentType: z.enum(['valid_id', 'profile_photo', 'cv', 'birth_certificate']),
  fileName: z.string(),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string(),
  uploadedAt: z.string(),
});

export const onboardingProfileFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['completed', 'in_progress']).optional(),
  role: z.enum(['employee', 'associate']).optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type OnboardingProfileView = z.infer<typeof onboardingProfileViewSchema>;
export type OnboardingDocumentView = z.infer<typeof onboardingDocumentViewSchema>;
export type OnboardingProfileFiltersInput = z.infer<typeof onboardingProfileFiltersSchema>;
