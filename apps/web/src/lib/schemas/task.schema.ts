import { z } from 'zod';

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'cancelled',
]);
export const taskCategorySchema = z.enum([
  'launch',
  'optimization',
  'maintenance',
  'research',
  'administrative',
  'other',
]);

export const taskSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    priority: taskPrioritySchema.default('medium'),
    status: taskStatusSchema.default('pending'),
    category: taskCategorySchema.optional().nullable(),
    tags: z.array(z.string().trim().min(1)).max(20).optional().default([]),
    dueDate: z.string().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    milestoneId: z.string().uuid().optional().nullable(),
    blockedReason: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((task, context) => {
    if (task.status === 'blocked' && !task.blockedReason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blockedReason'],
        message: 'Add a short reason when blocking a task',
      });
    }
  });

export const taskCreateSchema = taskSchema;
export const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  category: taskCategorySchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  blockedReason: z.string().trim().max(500).optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
