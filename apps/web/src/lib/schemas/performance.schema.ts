import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const reviewCycleStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
export const reviewStatusSchema = z.enum(['pending', 'self_review', 'manager_review', 'completed']);

export const keyResultSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  targetValue: z.number().nonnegative().default(0),
  currentValue: z.number().nonnegative().default(0),
  unit: z.string().default(''),
  weight: z.number().min(0).max(100).default(0),
  progressPercentage: z.number().min(0).max(100).default(0),
});

export const createReviewCycleSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    startDate: dateSchema,
    endDate: dateSchema,
    selfReviewDeadline: dateSchema.optional().nullable(),
    managerReviewDeadline: dateSchema.optional().nullable(),
    status: reviewCycleStatusSchema.default('draft'),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'startDate must be earlier than or equal to endDate',
    path: ['endDate'],
  });

export const updateReviewCycleSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    selfReviewDeadline: dateSchema.optional().nullable(),
    managerReviewDeadline: dateSchema.optional().nullable(),
    status: reviewCycleStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return data.startDate <= data.endDate;
    },
    {
      message: 'startDate must be earlier than or equal to endDate',
      path: ['endDate'],
    }
  );

export const createPerformanceReviewSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  reviewerId: z.string().uuid().optional().nullable(),
  status: reviewStatusSchema.default('pending'),
  selfRating: z.number().int().min(1).max(5).optional().nullable(),
  selfComments: z.string().optional().nullable(),
  managerRating: z.number().int().min(1).max(5).optional().nullable(),
  managerComments: z.string().optional().nullable(),
  finalRating: z.number().int().min(1).max(5).optional().nullable(),
  goalsForNextPeriod: z.string().optional().nullable(),
});

export const updatePerformanceReviewSchema = z.object({
  id: z.string().uuid(),
  status: reviewStatusSchema.optional(),
  reviewerId: z.string().uuid().optional().nullable(),
  selfRating: z.number().int().min(1).max(5).optional().nullable(),
  selfComments: z.string().optional().nullable(),
  managerRating: z.number().int().min(1).max(5).optional().nullable(),
  managerComments: z.string().optional().nullable(),
  finalRating: z.number().int().min(1).max(5).optional().nullable(),
  goalsForNextPeriod: z.string().optional().nullable(),
  submittedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const createOKRSchema = z.object({
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional().nullable(),
  objective: z.string().min(1),
  keyResults: z.array(keyResultSchema).default([]),
  progress: z.number().min(0).max(100).default(0),
  status: z.string().default('in_progress'),
});

export const updateOKRSchema = z.object({
  id: z.string().uuid(),
  objective: z.string().min(1).optional(),
  keyResults: z.array(keyResultSchema).optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.string().optional(),
});

export const createKPISchema = z
  .object({
    employeeId: z.string().uuid(),
    cycleId: z.string().uuid().optional().nullable(),
    name: z.string().min(1),
    targetValue: z.number(),
    currentValue: z.number().default(0),
    unit: z.string().optional().nullable(),
    periodStart: dateSchema,
    periodEnd: dateSchema,
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: 'periodStart must be earlier than or equal to periodEnd',
    path: ['periodEnd'],
  });

export const updateKPISchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional().nullable(),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
});

export const probationExtendSchema = z.object({
  action: z.literal('extend'),
  employeeId: z.string().uuid(),
  newProbationEndDate: dateSchema,
  reason: z.string().optional().nullable(),
});

export const probationCompleteSchema = z.object({
  action: z.literal('complete'),
  employeeId: z.string().uuid(),
  finalRating: z.number().int().min(1).max(5).optional().nullable(),
  comments: z.string().optional().nullable(),
});

export const probationActionSchema = z.discriminatedUnion('action', [
  probationExtendSchema,
  probationCompleteSchema,
]);

export type CreateReviewCycleInput = z.infer<typeof createReviewCycleSchema>;
export type UpdateReviewCycleInput = z.infer<typeof updateReviewCycleSchema>;
export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;
export type UpdatePerformanceReviewInput = z.infer<typeof updatePerformanceReviewSchema>;
export type CreateOKRInput = z.infer<typeof createOKRSchema>;
export type UpdateOKRInput = z.infer<typeof updateOKRSchema>;
export type CreateKPIInput = z.infer<typeof createKPISchema>;
export type UpdateKPIInput = z.infer<typeof updateKPISchema>;
export type ProbationActionInput = z.infer<typeof probationActionSchema>;
