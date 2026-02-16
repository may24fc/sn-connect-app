/**
 * Resource Schema - Main validation schema for Information Hub resources
 *
 * Validates all resource fields including conditional logic:
 * - file_path OR external_url must be provided
 * - expires_at must be after published_at when both exist
 * - file_size limits vary by resource_type (100MB video, 50MB others)
 */
import { z } from 'zod';
import {
  type ResourceId,
  type UserId,
} from '../database.types';

// ============================================
// Enum Schemas
// ============================================

/** Resource type classification */
export const resourceTypeSchema = z.enum([
  'video',
  'document',
  'image',
  'link',
  'presentation',
  'interactive',
]);

/** Resource category for organization */
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

/** Resource publishing status */
export const resourceStatusSchema = z.enum(['draft', 'published', 'archived']);

// ============================================
// Branded Type Schemas
// ============================================

/** Validates and brands a string as ResourceId */
export const resourceIdSchema = z
  .string()
  .uuid('Resource ID must be a valid UUID')
  .transform((val): ResourceId => val as ResourceId);

/** Validates and brands a string as UserId (for author_id) */
export const userIdSchema = z
  .string()
  .uuid('User ID must be a valid UUID')
  .transform((val): UserId => val as UserId);

// ============================================
// File Size Constants
// ============================================

/** Maximum file size for video resources: 100MB */
export const MAX_VIDEO_FILE_SIZE = 104_857_600;

/** Maximum file size for non-video resources: 50MB */
export const MAX_DOCUMENT_FILE_SIZE = 52_428_800;

// ============================================
// Base Resource Schema (without cross-field refinements)
// ============================================

const resourceBaseSchema = z.object({
  /** Resource title, required, 1-200 characters */
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),

  /** Optional description, max 5000 characters */
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or fewer')
    .nullish()
    .default(null),

  /** Optional short excerpt for previews */
  excerpt: z
    .string()
    .max(500, 'Excerpt must be 500 characters or fewer')
    .nullish()
    .default(null),

  /** Resource type classification */
  resource_type: resourceTypeSchema,

  /** Resource category */
  category: resourceCategorySchema,

  /** Optional subcategory for finer grouping */
  subcategory: z
    .string()
    .max(100, 'Subcategory must be 100 characters or fewer')
    .nullish()
    .default(null),

  /** Tags for search and filtering, max 20 items, each 1-50 chars */
  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be 50 characters or fewer')
    )
    .max(20, 'Maximum 20 tags allowed')
    .default([]),

  /** File path in storage (required if no external_url) */
  file_path: z.string().min(1).nullish().default(null),

  /** External URL (required if no file_path) */
  external_url: z.string().url('Must be a valid URL').nullish().default(null),

  /** Thumbnail image path */
  thumbnail_path: z.string().nullish().default(null),

  /** File size in bytes */
  file_size: z.number().int().nonnegative().nullish().default(null),

  /** MIME type of the file */
  mime_type: z.string().max(255).nullish().default(null),

  /** Duration in seconds (for video/audio resources) */
  duration_seconds: z.number().int().nonnegative().nullish().default(null),

  /** Publishing status */
  status: resourceStatusSchema.default('draft'),

  /** When the resource was/will be published */
  published_at: z.string().datetime().nullish().default(null),

  /** When the resource expires */
  expires_at: z.string().datetime().nullish().default(null),

  /** Whether the resource is visible to all authenticated users */
  is_public: z.boolean().default(true),

  /** Whether to feature this resource prominently */
  is_featured: z.boolean().default(false),

  /** Whether to pin this resource to the top */
  is_pinned: z.boolean().default(false),

  /** Display order for manual sorting */
  display_order: z.number().int().nonnegative().default(0),

  /** Version number for tracking updates */
  version: z.number().int().positive().default(1),

  /** Reference to previous version */
  previous_version_id: resourceIdSchema.nullish().default(null),

  /** Author user ID */
  author_id: userIdSchema,
});

// ============================================
// Refined Resource Schema (with cross-field validation)
// ============================================

/**
 * Full resource creation schema with cross-field validation:
 * 1. Either file_path or external_url must be provided
 * 2. expires_at must be after published_at when both are set
 * 3. File size must respect type-specific limits
 */
export const resourceSchema = resourceBaseSchema
  .refine(
    (data) => data.file_path != null || data.external_url != null,
    {
      message: 'Either file_path or external_url must be provided',
      path: ['file_path'],
    }
  )
  .refine(
    (data) => {
      if (data.published_at != null && data.expires_at != null) {
        return new Date(data.expires_at) > new Date(data.published_at);
      }
      return true;
    },
    {
      message: 'Expiration date must be after publication date',
      path: ['expires_at'],
    }
  )
  .refine(
    (data) => {
      if (data.file_size == null) return true;
      const limit =
        data.resource_type === 'video'
          ? MAX_VIDEO_FILE_SIZE
          : MAX_DOCUMENT_FILE_SIZE;
      return data.file_size <= limit;
    },
    {
      message: 'File size exceeds the maximum allowed for this resource type',
      path: ['file_size'],
    }
  );

// ============================================
// Update Schema (all fields optional except cross-field rules)
// ============================================

/**
 * Resource update schema - all fields optional.
 * Cross-field validation cannot be applied on partial updates
 * without merging with existing data (done at the service layer).
 */
export const resourceUpdateSchema = resourceBaseSchema.partial().omit({
  author_id: true,
});

// ============================================
// Inferred Types
// ============================================

/** Type for creating a new resource (after validation) */
export type ResourceCreateInput = z.infer<typeof resourceSchema>;

/** Type for updating an existing resource */
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;

/** Resource type enum values */
export type ResourceTypeValue = z.infer<typeof resourceTypeSchema>;

/** Resource category enum values */
export type ResourceCategoryValue = z.infer<typeof resourceCategorySchema>;

/** Resource status enum values */
export type ResourceStatusValue = z.infer<typeof resourceStatusSchema>;
