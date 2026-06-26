import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived',
]);

export const projectHealthSchema = z.enum(['on_track', 'at_risk', 'overdue']);

export const milestonePeriodTypeSchema = z.enum(['month', 'week']);

export const milestoneStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'submitted',
  'approved',
  'overdue',
]);

export const checklistItemStatusSchema = z.enum(['todo', 'done']);

export const projectContributorRoleSchema = z.enum(['lead', 'contributor']);

// ----- Project -----
export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  leadUserId: z.string().uuid('Lead user is required'),
  supervisorId: z.string().uuid().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  targetEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'targetEndDate must be YYYY-MM-DD'),
  status: projectStatusSchema.default('planning'),
  pointsTotal: z.number().int().nonnegative().optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  isCompletedAlready: z.boolean().default(false),
});

export const projectUpdateSchema = projectCreateSchema.partial();

// ----- Milestone -----
export const milestoneCreateSchema = z.object({
  projectId: z.string().uuid(),
  parentMilestoneId: z.string().uuid().optional().nullable(),
  periodType: milestonePeriodTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).optional().nullable(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  position: z.number().int().nonnegative().optional(),
});

export const milestoneUpdateSchema = milestoneCreateSchema
  .omit({ projectId: true, parentMilestoneId: true, periodType: true })
  .partial();

// ----- Checklist Item -----
export const checklistItemCreateSchema = z.object({
  milestoneId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(3000).optional().nullable(),
  position: z.number().int().nonnegative().optional(),
});

export const checklistItemUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(3000).optional().nullable(),
  status: checklistItemStatusSchema.optional(),
  position: z.number().int().nonnegative().optional(),
});

// ----- Contributor -----
export const contributorAddSchema = z.object({
  userId: z.string().uuid(),
  role: projectContributorRoleSchema.default('contributor'),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>;
export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>;
export type ChecklistItemCreateInput = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdateInput = z.infer<typeof checklistItemUpdateSchema>;
export type ContributorAddInput = z.infer<typeof contributorAddSchema>;
