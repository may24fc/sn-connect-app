import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');
const quarterKeySchema = z.string().regex(/^\d{4}-Q[1-4]$/, 'Use YYYY-Q#');

export const reviewCycleStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
export const reviewStatusSchema = z.enum(['pending', 'self_review', 'manager_review', 'completed']);
export const monthlySelfEvaluationResponseSchema = z.enum(['yes', 'sometimes', 'no']);

export const monthlySelfEvaluationDepartmentRoleOptions = [
  'Ads Specialist',
  'Graphic Designer',
  'Video Editor',
  'Social Media Creator',
  'Executive Assistant',
  'Personal Assistant',
  'Sales',
  'HR',
  'HR Intern',
  'Admin Assistant',
  'AI Intern',
  'Accounting Intern',
  'Other',
] as const;

export const monthlySelfEvaluationDepartmentRoleSchema = z.enum(
  monthlySelfEvaluationDepartmentRoleOptions
);
const assignmentSnapshotSchema = z.string().trim().min(1).max(200);

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
    okrSubmissionDeadline: dateSchema.optional().nullable(),
    kpiSubmissionDeadline: dateSchema.optional().nullable(),
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
    okrSubmissionDeadline: dateSchema.optional().nullable(),
    kpiSubmissionDeadline: dateSchema.optional().nullable(),
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
  description: z.string().optional().nullable(),
  keyResults: z.array(keyResultSchema).default([]),
  status: z.string().default('in_progress'),
  weight: z.number().min(0).default(1),
});

export const updateOKRSchema = z.object({
  id: z.string().uuid(),
  objective: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  keyResults: z.array(keyResultSchema).optional(),
  status: z.string().optional(),
  weight: z.number().min(0).optional(),
  adminRating: z
    .enum(['exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory'])
    .optional(),
  adminComments: z.string().optional(),
  evaluatedBy: z.string().uuid().optional(),
  evaluatedAt: z.string().datetime().optional(),
});

export const targetMetricTypeSchema = z.enum(['number', 'boolean', 'currency', 'tasks', 'scale']);

export const createOKRTargetSchema = z.object({
  okrId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  metricType: targetMetricTypeSchema.default('number'),
  startValue: z.number().default(0),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().optional().nullable(),
  weight: z.number().min(0).default(1),
  sortOrder: z.number().int().default(0),
  rubric1: z.string().min(1).optional(),
  rubric2: z.string().min(1).optional(),
  rubric3: z.string().min(1).optional(),
  rubric4: z.string().min(1).optional(),
});

export const updateOKRTargetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  metricType: targetMetricTypeSchema.optional(),
  startValue: z.number().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional().nullable(),
  weight: z.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
  adminRating: z
    .enum(['exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory'])
    .optional(),
  adminComments: z.string().optional(),
  evaluatedBy: z.string().uuid().optional(),
  evaluatedAt: z.string().datetime().optional(),
  rubric1: z.string().min(1).optional(),
  rubric2: z.string().min(1).optional(),
  rubric3: z.string().min(1).optional(),
  rubric4: z.string().min(1).optional(),
  selfRating: z.number().int().min(1).max(4).optional().nullable(),
});

export const kpiTypeSchema = z.enum(['numeric', 'scale']).default('numeric');

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
    kpiType: kpiTypeSchema,
    rubric1: z.string().min(1).optional(),
    rubric2: z.string().min(1).optional(),
    rubric3: z.string().min(1).optional(),
    rubric4: z.string().min(1).optional(),
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: 'periodStart must be earlier than or equal to periodEnd',
    path: ['periodEnd'],
  })
  .refine(
    (data) => {
      if (data.kpiType !== 'scale') return true;
      return !!data.rubric1 && !!data.rubric2 && !!data.rubric3 && !!data.rubric4;
    },
    {
      message: 'All 4 rubric descriptions are required for scale-type KPIs',
      path: ['rubric1'],
    }
  );

export const updateKPISchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional().nullable(),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
  status: z.string().optional(),
  selfRating: z.number().int().min(1).max(4).optional().nullable(),
  rubric1: z.string().min(1).optional(),
  rubric2: z.string().min(1).optional(),
  rubric3: z.string().min(1).optional(),
  rubric4: z.string().min(1).optional(),
  adminRating: z
    .enum(['exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory'])
    .optional(),
  adminComments: z.string().optional(),
  evaluatedBy: z.string().uuid().optional(),
  evaluatedAt: z.string().datetime().optional(),
});

export const createKPIEvidenceSchema = z.object({
  evidenceType: z.enum(['link', 'note', 'file']),
  content: z.string().min(1).max(5000),
  label: z.string().max(1000).optional().nullable(),
});

export const createOKRTargetEvidenceSchema = z.object({
  evidenceType: z.enum(['link', 'note', 'file']),
  content: z.string().min(1).max(5000),
  label: z.string().max(1000).optional().nullable(),
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

export const probationSetStatusSchema = z.object({
  action: z.literal('set-status'),
  employeeId: z.string().uuid(),
  status: z.enum(['on-track', 'at-risk']),
});

export const submitMonthlySelfEvaluationSchema = z.object({
  monthKey: monthKeySchema,
  fullName: z.string().trim().min(1).max(200),
  departmentRole: assignmentSnapshotSchema,
  topThreeThingsWorkedOn: z.string().trim().min(1).max(4000),
  biggestImpact: z.string().trim().min(1).max(3000),
  impactReason: z.string().trim().min(1).max(3000),
  significantAchievement: z.string().trim().min(1).max(3000),
  challengeResolved: z.string().trim().min(1).max(3000),
  monthlyImprovement: z.string().trim().min(1).max(3000),
  workSlowdown: z.string().trim().min(1).max(3000),
  unseenWorkflowIssue: z.string().trim().min(1).max(3000),
  requestedSupport: z.string().trim().min(1).max(3000),
  productivityScore: z.number().int().min(1).max(10),
  productivityReason: z.string().trim().min(1).max(3000),
  ownershipOutsideRole: z.string().trim().min(1).max(3000),
  professionalImprovementArea: z.string().trim().min(1).max(3000),
  nextSkillToLearn: z.string().trim().min(1).max(3000),
  leadershipDidWell: z.string().trim().min(1).max(3000),
  leadershipCanImprove: z.string().trim().min(1).max(3000),
  contributionsVisible: monthlySelfEvaluationResponseSchema,
  comfortableRaisingConcerns: monthlySelfEvaluationResponseSchema,
  hiddenProductivityIssue: z.string().trim().min(1).max(3000),
  immediateImprovement: z.string().trim().min(1).max(3000),
  additionalComments: z.string().trim().max(3000).optional().default(''),
  nextMonthGoal: z.string().trim().min(1).max(3000),
});

export const monthlySelfEvaluationFiltersSchema = z.object({
  monthKey: monthKeySchema.optional(),
  departmentRole: assignmentSnapshotSchema.optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});

export const performanceEvaluationDraftKindSchema = z.enum([
  'monthly',
  'quarterly',
  'five_percent',
  'monthly_call_feedback',
]);

export const submitMonthlySelfEvaluationDraftSchema = submitMonthlySelfEvaluationSchema.partial();

export const monthlyCallFeedbackValuablePartSchema = z.enum([
  'CEO Discussion (Financial Growth)',
  'Icebreaker / Conversation Starters',
  '5% Reflection Worksheet Sharing',
  'Announcements',
]);

export const monthlyCallFeedbackCallLengthSchema = z.enum([
  'too_long',
  'just_right',
  'too_short',
]);

export const monthlyCallFeedbackClaritySchema = z.enum([
  'very_clear',
  'clear',
  'neutral',
  'not_clear',
]);

export const submitMonthlyCallFeedbackSchema = z.object({
  monthKey: monthKeySchema,
  fullName: z.string().trim().min(1).max(200),
  departmentRole: assignmentSnapshotSchema,
  engagementLevel: z.number().int().min(1).max(4),
  engagementReason: z.string().trim().min(1).max(3000),
  valuableParts: z.array(monthlyCallFeedbackValuablePartSchema).min(1),
  valuablePartsReason: z.string().trim().min(1).max(3000),
  callLength: monthlyCallFeedbackCallLengthSchema,
  clarityFinancialGrowthDiscussion: monthlyCallFeedbackClaritySchema,
  clarityIcebreakerConversationStarters: monthlyCallFeedbackClaritySchema,
  clarityFivePercentReflectionWorksheet: monthlyCallFeedbackClaritySchema,
  overallRating: z.number().int().min(1).max(4),
  keyTakeaway: z.string().trim().min(1).max(3000),
  futureImprovements: z.string().trim().min(1).max(3000),
  nextTopics: z.string().trim().min(1).max(3000),
});

export const monthlyCallFeedbackFiltersSchema = z.object({
  monthKey: monthKeySchema.optional(),
  departmentRole: assignmentSnapshotSchema.optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});

export const submitMonthlyCallFeedbackDraftSchema = submitMonthlyCallFeedbackSchema.partial();

export const submitQuarterlyTemperatureCheckSchema = z.object({
  quarterKey: quarterKeySchema,
  fullName: z.string().trim().min(1).max(200),
  departmentRole: assignmentSnapshotSchema,
  energyWorkloadScore: z.number().int().min(1).max(10),
  energyWorkloadReason: z.string().trim().min(1).max(3000),
  claritySupport: z.string().trim().min(1).max(3000),
  improvementChange: z.string().trim().min(1).max(3000),
  achievementRecognition: z.string().trim().min(1).max(3000),
  feedbackSuggestions: z.string().trim().min(1).max(3000),
  overallExperienceScore: z.number().int().min(1).max(5),
  overallExperienceReason: z.string().trim().min(1).max(3000),
});

export const quarterlyTemperatureCheckFiltersSchema = z.object({
  quarterKey: quarterKeySchema.optional(),
  departmentRole: assignmentSnapshotSchema.optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});

export const submitQuarterlyTemperatureCheckDraftSchema =
  submitQuarterlyTemperatureCheckSchema.partial();

export const submitFivePercentReflectionSchema = z.object({
  monthKey: monthKeySchema,
  fullName: z.string().trim().min(1).max(200),
  departmentRole: assignmentSnapshotSchema,
  workFeelings: z.string().trim().min(1).max(250),
  workHeadline: z.string().trim().min(1).max(500),
  workSignificance: z.string().trim().min(1).max(3000),
  workRank: z.number().int().min(1).max(10),
  workAction: z.string().trim().min(1).max(3000),
  familyFeelings: z.string().trim().min(1).max(250),
  familyHeadline: z.string().trim().min(1).max(500),
  familySignificance: z.string().trim().min(1).max(3000),
  familyRank: z.number().int().min(1).max(10),
  familyAction: z.string().trim().min(1).max(3000),
  personalFeelings: z.string().trim().min(1).max(250),
  personalHeadline: z.string().trim().min(1).max(500),
  personalSignificance: z.string().trim().min(1).max(3000),
  personalRank: z.number().int().min(1).max(10),
  personalAction: z.string().trim().min(1).max(3000),
  deepDiveParkingLot: z.string().trim().min(1).max(4000),
  explorationTopics: z.string().trim().min(1).max(4000),
});

export const fivePercentReflectionFiltersSchema = z.object({
  monthKey: monthKeySchema.optional(),
  departmentRole: assignmentSnapshotSchema.optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});

export const submitFivePercentReflectionDraftSchema =
  submitFivePercentReflectionSchema.partial();

export const performanceEvaluationDraftQuerySchema = z
  .object({
    evaluationKind: performanceEvaluationDraftKindSchema,
    cycleKey: z.string().trim().min(1).max(20),
  })
  .superRefine((data, ctx) => {
    if (
      data.evaluationKind === 'monthly' ||
      data.evaluationKind === 'five_percent' ||
      data.evaluationKind === 'monthly_call_feedback'
    ) {
      if (!monthKeySchema.safeParse(data.cycleKey).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use YYYY-MM for monthly, monthly call feedback, and 5% draft keys',
          path: ['cycleKey'],
        });
      }
    }

    if (data.evaluationKind === 'quarterly') {
      if (!quarterKeySchema.safeParse(data.cycleKey).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use YYYY-Q# for quarterly draft keys',
          path: ['cycleKey'],
        });
      }
    }
  });

export const performanceEvaluationSummaryQuerySchema = z
  .object({
    evaluationKind: performanceEvaluationDraftKindSchema,
    periodKey: z.string().trim().min(1).max(20),
  })
  .superRefine((data, ctx) => {
    if (
      data.evaluationKind === 'monthly' ||
      data.evaluationKind === 'five_percent' ||
      data.evaluationKind === 'monthly_call_feedback'
    ) {
      if (!monthKeySchema.safeParse(data.periodKey).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use YYYY-MM for monthly, monthly call feedback, and 5% summary keys',
          path: ['periodKey'],
        });
      }
    }

    if (data.evaluationKind === 'quarterly') {
      if (!quarterKeySchema.safeParse(data.periodKey).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use YYYY-Q# for quarterly summary keys',
          path: ['periodKey'],
        });
      }
    }
  });

export const generatePerformanceEvaluationSummarySchema =
  performanceEvaluationSummaryQuerySchema.and(
    z.object({
      forceRegenerate: z.boolean().optional().default(false),
    })
  );

export const upsertPerformanceEvaluationDraftSchema = z.discriminatedUnion('evaluationKind', [
  z.object({
    evaluationKind: z.literal('monthly'),
    cycleKey: monthKeySchema,
    values: submitMonthlySelfEvaluationDraftSchema,
  }),
  z.object({
    evaluationKind: z.literal('quarterly'),
    cycleKey: quarterKeySchema,
    values: submitQuarterlyTemperatureCheckDraftSchema,
  }),
  z.object({
    evaluationKind: z.literal('five_percent'),
    cycleKey: monthKeySchema,
    values: submitFivePercentReflectionDraftSchema,
  }),
  z.object({
    evaluationKind: z.literal('monthly_call_feedback'),
    cycleKey: monthKeySchema,
    values: submitMonthlyCallFeedbackDraftSchema,
  }),
]);

export const probationActionSchema = z.discriminatedUnion('action', [
  probationExtendSchema,
  probationCompleteSchema,
  probationSetStatusSchema,
]);

export type CreateReviewCycleInput = z.infer<typeof createReviewCycleSchema>;
export type UpdateReviewCycleInput = z.infer<typeof updateReviewCycleSchema>;
export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;
export type UpdatePerformanceReviewInput = z.infer<typeof updatePerformanceReviewSchema>;
export type CreateOKRInput = z.infer<typeof createOKRSchema>;
export type UpdateOKRInput = z.infer<typeof updateOKRSchema>;
export type CreateOKRTargetInput = z.infer<typeof createOKRTargetSchema>;
export type UpdateOKRTargetInput = z.infer<typeof updateOKRTargetSchema>;
export type CreateKPIInput = z.infer<typeof createKPISchema>;
export type UpdateKPIInput = z.infer<typeof updateKPISchema>;
export type SubmitMonthlySelfEvaluationInput = z.infer<typeof submitMonthlySelfEvaluationSchema>;
export type MonthlySelfEvaluationFiltersInput = z.infer<typeof monthlySelfEvaluationFiltersSchema>;
export type PerformanceEvaluationDraftKind = z.infer<typeof performanceEvaluationDraftKindSchema>;
export type SubmitMonthlySelfEvaluationDraftInput = z.infer<
  typeof submitMonthlySelfEvaluationDraftSchema
>;
export type SubmitMonthlyCallFeedbackInput = z.infer<typeof submitMonthlyCallFeedbackSchema>;
export type MonthlyCallFeedbackFiltersInput = z.infer<typeof monthlyCallFeedbackFiltersSchema>;
export type SubmitMonthlyCallFeedbackDraftInput = z.infer<
  typeof submitMonthlyCallFeedbackDraftSchema
>;
export type SubmitQuarterlyTemperatureCheckInput = z.infer<
  typeof submitQuarterlyTemperatureCheckSchema
>;
export type QuarterlyTemperatureCheckFiltersInput = z.infer<
  typeof quarterlyTemperatureCheckFiltersSchema
>;
export type SubmitQuarterlyTemperatureCheckDraftInput = z.infer<
  typeof submitQuarterlyTemperatureCheckDraftSchema
>;
export type SubmitFivePercentReflectionInput = z.infer<typeof submitFivePercentReflectionSchema>;
export type FivePercentReflectionFiltersInput = z.infer<typeof fivePercentReflectionFiltersSchema>;
export type SubmitFivePercentReflectionDraftInput = z.infer<
  typeof submitFivePercentReflectionDraftSchema
>;
export type PerformanceEvaluationDraftQueryInput = z.infer<
  typeof performanceEvaluationDraftQuerySchema
>;
export type PerformanceEvaluationSummaryQueryInput = z.infer<
  typeof performanceEvaluationSummaryQuerySchema
>;
export type GeneratePerformanceEvaluationSummaryInput = z.infer<
  typeof generatePerformanceEvaluationSummarySchema
>;
export type UpsertPerformanceEvaluationDraftInput = z.infer<
  typeof upsertPerformanceEvaluationDraftSchema
>;
export type CreateOKRTargetEvidenceInput = z.infer<typeof createOKRTargetEvidenceSchema>;
export type ProbationActionInput = z.infer<typeof probationActionSchema>;
