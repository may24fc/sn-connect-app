import { z } from 'zod';

export const ticketTeamSchema = z.enum(['hr', 'it']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketStatusSchema = z.enum([
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_on_user',
  'resolved',
  'closed',
]);

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(200),
  description: z.string().trim().min(10, 'Description is required').max(5000),
  team: ticketTeamSchema,
  priority: ticketPrioritySchema.default('medium'),
});

export const ticketUpdateSchema = z.object({
  team: ticketTeamSchema.optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  priority: ticketPrioritySchema.optional(),
  status: ticketStatusSchema.optional(),
  resolutionSummary: z.string().trim().max(5000).nullable().optional(),
});

export const ticketHandlerSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;