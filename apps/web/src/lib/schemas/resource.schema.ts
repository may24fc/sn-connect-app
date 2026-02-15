import { z } from 'zod';

// ============================================
// Enum Schemas
// ============================================

export const resourceTypeSchema = z.enum([
  'video',
  'document',
  'image',
  'link',
  'presentation',
  'interactive',
]);

export const resourceCategorySchema = z.enum([
  'onboarding',
  'training',
  'policies',
  'benefits',
  'tools',
  'culture',
  'department_specific',
  'forms_templates',
  'performance',
  'emergency',
]);

export const resourceStatusSchema = z.enum(['draft', 'published', 'archived']);

// ============================================
// Base Schemas
// ============================================

const resourceBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional().nullable(),
  excerpt: z.string().max(300, 'Excerpt is too long').optional().nullable(),
  resourceType: resourceTypeSchema,
  category: resourceCategorySchema,
  subcategory: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  filePath: z.string().optional().nullable(),
  externalUrl: z.string().url('Invalid URL').optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  durationSeconds: z.number().int().positive().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isPublic: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
  targetDepartments: z.array(z.string().uuid()).default([]),
  targetEmployees: z.array(z.string().uuid()).default([]),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

// ============================================
// Create/Update Schemas
// ============================================

export const createResourceSchema = resourceBaseSchema
  .refine((data) => data.filePath || data.externalUrl, {
    message: 'Either a file path or external URL is required',
    path: ['filePath'],
  })
  .refine((data) => !(data.expiresAt && data.publishedAt) || data.expiresAt > data.publishedAt, {
    message: 'Expiration must be later than publish date',
    path: ['expiresAt'],
  });

export const updateResourceSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    excerpt: z.string().max(300).optional().nullable(),
    resourceType: resourceTypeSchema.optional(),
    category: resourceCategorySchema.optional(),
    subcategory: z.string().max(100).optional().nullable(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    filePath: z.string().optional().nullable(),
    externalUrl: z.string().url('Invalid URL').optional().nullable(),
    thumbnailPath: z.string().optional().nullable(),
    fileSize: z.number().int().positive().optional().nullable(),
    mimeType: z.string().max(100).optional().nullable(),
    durationSeconds: z.number().int().positive().optional().nullable(),
    status: resourceStatusSchema.optional(),
    publishedAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    isPublic: z.boolean().optional(),
    targetRoles: z.array(z.string()).optional(),
    targetDepartments: z.array(z.string().uuid()).optional(),
    targetEmployees: z.array(z.string().uuid()).optional(),
    isFeatured: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine((data) => !(data.expiresAt && data.publishedAt) || data.expiresAt > data.publishedAt, {
    message: 'Expiration must be later than publish date',
    path: ['expiresAt'],
  });

// ============================================
// Filter Schemas
// ============================================

export const resourceFiltersSchema = z.object({
  search: z.string().optional(),
  status: resourceStatusSchema.optional(),
  category: resourceCategorySchema.optional(),
  resourceType: resourceTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().uuid().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'published_at', 'view_count', 'title']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const resourceFeedFiltersSchema = z.object({
  search: z.string().optional(),
  category: resourceCategorySchema.optional(),
  resourceType: resourceTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const resourceSearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  category: resourceCategorySchema.optional(),
  resourceType: resourceTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============================================
// Collection Schemas
// ============================================

export const createCollectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  isPublic: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
  targetDepartments: z.array(z.string().uuid()).default([]),
});

export const updateCollectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
  targetDepartments: z.array(z.string().uuid()).optional(),
});

export const addResourceToCollectionSchema = z.object({
  resourceId: z.string().uuid('Invalid resource ID'),
  displayOrder: z.number().int().default(0),
});

// ============================================
// Bookmark Schemas
// ============================================

export const bookmarkResourceSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

// ============================================
// View Tracking Schema
// ============================================

export const trackViewSchema = z.object({
  durationSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

// ============================================
// Upload Schema
// ============================================

export const resourceUploadSchema = z.object({
  fileName: z.string().min(1),
  category: resourceCategorySchema,
  resourceType: resourceTypeSchema,
});

export const bulkUploadSchema = z.object({
  category: resourceCategorySchema,
  resourceType: resourceTypeSchema,
  isPublic: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
});

// ============================================
// Type Exports
// ============================================

export type ResourceType = z.infer<typeof resourceTypeSchema>;
export type ResourceCategory = z.infer<typeof resourceCategorySchema>;
export type ResourceStatus = z.infer<typeof resourceStatusSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceFiltersInput = z.infer<typeof resourceFiltersSchema>;
export type ResourceFeedFiltersInput = z.infer<typeof resourceFeedFiltersSchema>;
export type ResourceSearchInput = z.infer<typeof resourceSearchSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddResourceToCollectionInput = z.infer<typeof addResourceToCollectionSchema>;
export type BookmarkResourceInput = z.infer<typeof bookmarkResourceSchema>;
export type TrackViewInput = z.infer<typeof trackViewSchema>;
export type ResourceUploadInput = z.infer<typeof resourceUploadSchema>;
export type BulkUploadInput = z.infer<typeof bulkUploadSchema>;

// ============================================
// Constants
// ============================================

export const RESOURCE_CATEGORIES = [
  {
    value: 'onboarding',
    label: 'Onboarding',
    description: 'Welcome videos, first-week checklists',
  },
  {
    value: 'training',
    label: 'Training & Development',
    description: 'Courses, workshops, skill-building',
  },
  {
    value: 'policies',
    label: 'Policies & Procedures',
    description: 'Employee handbook, code of conduct',
  },
  {
    value: 'benefits',
    label: 'Benefits & Perks',
    description: 'Health insurance, retirement plans',
  },
  { value: 'tools', label: 'Tools & Systems', description: 'Software tutorials, IT help' },
  { value: 'culture', label: 'Company Culture', description: 'Mission, values, team photos' },
  {
    value: 'department_specific',
    label: 'Department-Specific',
    description: 'Team-specific resources',
  },
  {
    value: 'forms_templates',
    label: 'Forms & Templates',
    description: 'Expense reports, templates',
  },
  {
    value: 'performance',
    label: 'Performance Management',
    description: 'Review templates, OKR resources',
  },
  {
    value: 'emergency',
    label: 'Emergency & Safety',
    description: 'Evacuation plans, contact lists',
  },
] as const;

export const RESOURCE_TYPES = [
  { value: 'video', label: 'Video', icon: 'Video', accept: 'video/mp4,video/webm' },
  {
    value: 'document',
    label: 'Document',
    icon: 'FileText',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx',
  },
  { value: 'image', label: 'Image', icon: 'Image', accept: 'image/jpeg,image/png,image/gif' },
  { value: 'link', label: 'Link', icon: 'Link', accept: null },
  { value: 'presentation', label: 'Presentation', icon: 'Presentation', accept: '.ppt,.pptx' },
  { value: 'interactive', label: 'Interactive', icon: 'MousePointer', accept: null },
] as const;

export const RESOURCE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'zinc' },
  { value: 'published', label: 'Published', color: 'emerald' },
  { value: 'archived', label: 'Archived', color: 'amber' },
] as const;
