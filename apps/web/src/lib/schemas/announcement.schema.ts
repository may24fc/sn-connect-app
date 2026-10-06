import { z } from 'zod';

export const announcementPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export const announcementStatusSchema = z.enum([
  'draft',
  'scheduled',
  'published',
  'expired',
  'archived',
]);
export const announcementCategorySchema = z.enum([
  'hr_updates',
  'benefits',
  'events',
  'performance',
  'training',
  'policy',
  'general',
  'emergency',
]);

// Valid consolidated role names
const validRoles = ['employee', 'associate', 'admin', 'super_admin'] as const;

// Accepts ISO 8601 datetime strings or null/undefined
const optionalDatetime = z.string().datetime({ offset: true }).nullable().optional();

const announcementBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  excerpt: z.string().max(200).nullable().optional(),
  category: announcementCategorySchema.default('general'),
  priority: announcementPrioritySchema.default('normal'),
  status: announcementStatusSchema.default('draft'),
  publishedAt: optionalDatetime,
  expiresAt: optionalDatetime,
  targetRoles: z.array(z.enum(validRoles)).default([]),
  targetDepartments: z.array(z.string()).max(500).default([]),
  targetEmployees: z.array(z.string()).max(500).default([]),
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(false),
});

export const createAnnouncementSchema = announcementBaseSchema.refine(
  (value) => !(value.expiresAt && value.publishedAt) || value.expiresAt > value.publishedAt,
  {
    message: 'Expiration must be later than publish date',
    path: ['expiresAt'],
  }
);

export const updateAnnouncementSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200).optional(),
    content: z.string().min(1, 'Content is required').max(10000).optional(),
    excerpt: z.string().max(200).nullable().optional(),
    category: announcementCategorySchema.optional(),
    priority: announcementPrioritySchema.optional(),
    status: announcementStatusSchema.optional(),
    publishedAt: optionalDatetime,
    expiresAt: optionalDatetime,
    targetRoles: z.array(z.string()).max(20).optional(),
    targetDepartments: z.array(z.string().uuid()).max(500).optional(),
    targetEmployees: z.array(z.string().uuid()).max(500).optional(),
    isPinned: z.boolean().optional(),
    allowComments: z.boolean().optional(),
  })
  .refine(
    (value) => !(value.expiresAt && value.publishedAt) || value.expiresAt > value.publishedAt,
    {
      message: 'Expiration must be later than publish date',
      path: ['expiresAt'],
    }
  );

export const announcementFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  status: announcementStatusSchema.optional(),
  category: z.string().optional(),
  priority: announcementPrioritySchema.optional(),
  readStatus: z.string().optional(),
  authorId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const announcementAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(1000),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
});

const resourceBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().min(1, 'Category is required').max(100),
  filePath: z.string().max(1000).optional().nullable(),
  externalUrl: z.string().url().max(2048).optional().nullable(),
  isPublic: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
});

export const createResourceSchema = resourceBaseSchema.refine(
  (value) => value.filePath || value.externalUrl,
  {
    message: 'Either a file path or external URL is required',
    path: ['filePath'],
  }
);

export const updateResourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().min(1, 'Category is required').max(100).optional(),
  filePath: z.string().max(1000).optional().nullable(),
  externalUrl: z.string().url().max(2048).optional().nullable(),
  isPublic: z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementFiltersInput = z.infer<typeof announcementFiltersSchema>;
export type AnnouncementAttachmentInput = z.infer<typeof announcementAttachmentSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
