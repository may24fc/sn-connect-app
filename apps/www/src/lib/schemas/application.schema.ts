import { z } from 'zod';

export const applicationSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  job_posting_id: z.string().uuid('Please select a job posting'),
  cover_letter: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
