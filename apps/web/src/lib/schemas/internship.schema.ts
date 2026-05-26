import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const nonEmptyTrimmedStringSchema = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyTrimmedStringSchema).max(20);
const dailyLogHoursSchema = z.coerce
  .number()
  .min(0.25, 'Hours worked must be at least 0.25')
  .max(40, 'Hours worked cannot exceed 40');

function isFutureIsoDate(value: string): boolean {
  const today = new Date().toISOString().split('T')[0] ?? '';
  return value > today;
}

const dailyLogDateSchema = isoDateSchema.refine((value) => !isFutureIsoDate(value), {
  message: 'Log date cannot be in the future',
});

export const dailyLogProjectEntrySchema = z.object({
  id: z.string().uuid().optional(),
  projectFocus: nonEmptyTrimmedStringSchema,
  challenge: nonEmptyTrimmedStringSchema,
  actionTaken: nonEmptyTrimmedStringSchema,
  outcome: nonEmptyTrimmedStringSchema,
});

export const dailyLogAttachmentSchema = z.object({
  id: z.string().uuid(),
  fileName: nonEmptyTrimmedStringSchema,
  filePath: nonEmptyTrimmedStringSchema,
  fileSize: z.coerce.number().int().min(0),
  mimeType: nonEmptyTrimmedStringSchema,
  signedUrl: z.string().url().nullable().optional(),
});

export const dailyLogAttachmentPersistedSchema = dailyLogAttachmentSchema.omit({ signedUrl: true });

export const internshipStatusSchema = z.enum(['active', 'completed', 'terminated', 'converted']);

export const internshipFiltersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: internshipStatusSchema.optional(),
  school: z.string().trim().min(1).optional(),
  supervisorId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const createInternshipSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  requiredHours: z.coerce.number().int().min(1).max(20000).default(480),
  completedHours: z.coerce.number().min(0).max(20000).default(0),
  status: internshipStatusSchema.default('active'),
  supervisorId: z.string().uuid().nullable().optional(),
  department: z.string().trim().min(1),
  school: z.string().trim().min(1).nullable().optional(),
  program: z.string().trim().min(1).nullable().optional(),
});

export const updateInternshipSchema = createInternshipSchema
  .omit({ employeeId: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required',
  });

export const internshipActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('end_internship'),
  }),
  z.object({
    action: z.literal('hire_as_employee'),
  }),
]);

export const internDailyLogStatusSchema = z.enum(['draft', 'submitted']);

export const createInternDailyLogSchema = z.object({
  logDate: dailyLogDateSchema,
  hoursWorked: dailyLogHoursSchema,
  projectEntries: z.array(dailyLogProjectEntrySchema).min(1).max(20),
  blockers: stringListSchema.optional(),
  nextSteps: stringListSchema.optional(),
  retainedAttachments: z.array(dailyLogAttachmentPersistedSchema).optional(),
  status: internDailyLogStatusSchema.default('submitted'),
});

/** Schema for interns editing their own draft logs. */
export const updateInternDraftLogSchema = z.object({
  logId: z.string().uuid(),
  logDate: dailyLogDateSchema.optional(),
  hoursWorked: dailyLogHoursSchema.optional(),
  projectEntries: z.array(dailyLogProjectEntrySchema).min(1).max(20).optional(),
  blockers: stringListSchema.optional(),
  nextSteps: stringListSchema.optional(),
  retainedAttachments: z.array(dailyLogAttachmentPersistedSchema).optional(),
  status: internDailyLogStatusSchema.optional(),
});

export const updateInternDailyLogSchema = z
  .object({
    logId: z.string().uuid(),
    supervisorNotes: z.string().trim().nullable().optional(),
    isApproved: z.boolean().optional(),
  })
  .refine((payload) => payload.supervisorNotes !== undefined || payload.isApproved !== undefined, {
    message: 'At least one field is required',
  });

export type InternshipFiltersInput = z.infer<typeof internshipFiltersSchema>;
export type CreateInternshipInput = z.infer<typeof createInternshipSchema>;
export type UpdateInternshipInput = z.infer<typeof updateInternshipSchema>;
export type InternshipActionInput = z.infer<typeof internshipActionSchema>;
export type CreateInternDailyLogInput = z.infer<typeof createInternDailyLogSchema>;
export type UpdateInternDailyLogInput = z.infer<typeof updateInternDailyLogSchema>;

/**
 * Schema for intern self-initialization.
 * Validates the payload sent by an intern to create their own internship record.
 */
export const initializeInternshipSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  department: z.string().trim().min(1, 'Department is required'),
  school: z.string().trim().min(1, 'School is required'),
  program: z.string().trim().min(1, 'Program is required'),
  requiredHours: z.coerce.number().int().min(1).max(20000).default(480),
});

export type InitializeInternshipInput = z.infer<typeof initializeInternshipSchema>;
