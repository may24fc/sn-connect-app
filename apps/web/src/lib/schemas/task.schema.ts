import { z } from 'zod';

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const taskCategorySchema = z.enum([
  'launch',
  'optimization',
  'maintenance',
  'research',
  'administrative',
  'other',
]);

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: taskPrioritySchema.default('medium'),
  status: taskStatusSchema.default('pending'),
  category: taskCategorySchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  dueDate: z.string().optional().nullable(),
});

export const taskCreateSchema = taskSchema;
export const taskUpdateSchema = taskSchema.partial();

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
