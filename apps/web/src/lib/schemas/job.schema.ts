import { z } from 'zod';

export const jobPostingFiltersSchema = z.object({
  search: z.string().optional(),
  employmentType: z.enum(['full-time', 'part-time', 'internship', 'contract']).optional(),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createJobPostingSchema = z.object({
  title: z.string().min(2).max(200),
  business_unit_id: z.string().uuid().optional().nullable(),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  total_headcount: z.coerce.number().int().min(1).max(999).default(1),
  employment_type: z.enum(['full-time', 'part-time', 'internship', 'contract']).default('full-time'),
  description: z.string().min(10),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  salary_range: z.string().max(100).optional(),
  is_active: z.boolean().default(true),
  closes_at: z.string().datetime().optional().nullable(),
});

export const updateJobPostingSchema = createJobPostingSchema.partial();

export const applicationFiltersSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'approved', 'hired'])
    .optional(),
  jobPostingId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'approved', 'hired']),
  notes: z.string().max(5000).optional(),
});
