import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const crossDepartmentWorkRequestCreateSchema = z.object({
  targetDepartmentId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  suggestedAssigneeId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: prioritySchema.default('medium'),
  dueDate: dateSchema.optional().nullable(),
});

export const crossDepartmentWorkRequestResponseSchema = z.object({
  action: z.enum(['approve', 'request_changes', 'reject']),
  assigneeId: z.string().uuid().optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const crossDepartmentWorkRequestRevisionSchema = z.object({
  action: z.enum(['cancel', 'resubmit']),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: prioritySchema.optional(),
  dueDate: dateSchema.optional().nullable(),
});

export type CrossDepartmentWorkRequestCreateInput = z.infer<
  typeof crossDepartmentWorkRequestCreateSchema
>;
export type CrossDepartmentWorkRequestResponseInput = z.infer<
  typeof crossDepartmentWorkRequestResponseSchema
>;
export type CrossDepartmentWorkRequestRevisionInput = z.infer<
  typeof crossDepartmentWorkRequestRevisionSchema
>;
