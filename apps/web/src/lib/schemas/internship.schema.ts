import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

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
  logDate: isoDateSchema,
  hoursWorked: z.coerce.number().min(0.25).max(24),
  tasksCompleted: z.string().trim().min(1),
  learnings: z.string().trim().nullable().optional(),
  challenges: z.string().trim().nullable().optional(),
  status: internDailyLogStatusSchema.default('submitted'),
});

/** Schema for interns editing their own draft logs. */
export const updateInternDraftLogSchema = z.object({
  logId: z.string().uuid(),
  logDate: isoDateSchema.optional(),
  hoursWorked: z.coerce.number().min(0.25).max(24).optional(),
  tasksCompleted: z.string().trim().min(1).optional(),
  learnings: z.string().trim().nullable().optional(),
  challenges: z.string().trim().nullable().optional(),
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
