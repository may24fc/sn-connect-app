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

export const milestoneComplexityTierSchema = z.enum(['routine', 'standard', 'complex', 'epic']);
export type MilestoneComplexityTier = z.infer<typeof milestoneComplexityTierSchema>;

export const COMPLEXITY_TIER_XP: Record<MilestoneComplexityTier, number> = {
  routine: 50,
  standard: 150,
  complex: 300,
  epic: 600,
} as const;

export const COMPLEXITY_TIER_LABEL: Record<MilestoneComplexityTier, string> = {
  routine: 'Routine — 50 XP',
  standard: 'Standard — 150 XP',
  complex: 'Complex — 300 XP',
  epic: 'Epic — 600 XP',
} as const;

// Color matrix for the gamified XP vocabulary — same dark-bg/vibrant-text pill language
// used for League tags and rarity tags, so value reads consistently across the platform.
export const COMPLEXITY_TIER_BADGE_CLASSES: Record<MilestoneComplexityTier, string> = {
  routine: 'bg-zinc-800 text-zinc-200 ring-1 ring-zinc-500/60',
  standard: 'bg-sky-950 text-sky-300 ring-1 ring-sky-600/60',
  complex: 'bg-amber-950 text-amber-300 ring-1 ring-amber-600/60',
  epic: 'bg-fuchsia-950 text-fuchsia-300 ring-1 ring-fuchsia-500/60 shadow-[0_0_8px_rgba(217,70,239,0.35)]',
} as const;

// Small solid-color dot used next to tier options in <Select> dropdowns.
export const COMPLEXITY_TIER_DOT_CLASSES: Record<MilestoneComplexityTier, string> = {
  routine: 'bg-zinc-400',
  standard: 'bg-sky-500',
  complex: 'bg-amber-500',
  epic: 'bg-fuchsia-500',
} as const;

// Text emphasis applied to the tier label itself (e.g. inside a <Select> trigger/option).
export const COMPLEXITY_TIER_TEXT_CLASSES: Record<MilestoneComplexityTier, string> = {
  routine: 'text-zinc-600 dark:text-zinc-400',
  standard: 'text-sky-600 dark:text-sky-400',
  complex: 'font-semibold text-amber-600 dark:text-amber-400',
  epic: 'font-semibold text-fuchsia-600 dark:text-fuchsia-400',
} as const;

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
  // v2: complexity tier (weekly milestones only) and department for mastery tracking
  complexityTier: milestoneComplexityTierSchema.optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
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
