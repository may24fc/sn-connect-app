/**
 * Resource Filter Schema - Query parameter validation for resource list/search
 *
 * Used to validate query params on GET /api/resources endpoints.
 * All fields are optional with sensible defaults.
 */
import { z } from 'zod';
import { resourceCategorySchema, resourceStatusSchema, resourceTypeSchema } from './resourceSchema';

// ============================================
// Sort & Pagination
// ============================================

/** Allowed sort fields for resource listing */
export const resourceSortFieldSchema = z.enum([
  'title',
  'created_at',
  'updated_at',
  'published_at',
  'view_count',
  'download_count',
  'display_order',
]);

/** Sort direction */
export const sortDirectionSchema = z.enum(['asc', 'desc']);

/** Page size options matching enterprise data grid pattern */
export const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((val) => [10, 25, 50, 100].includes(val), {
    message: 'Page size must be 10, 25, 50, or 100',
  })
  .default(25);

// ============================================
// Filter Schema
// ============================================

/**
 * Resource filter schema for query parameters.
 * Supports text search, enum filtering, date ranges, and pagination.
 */
export const resourceFilterSchema = z.object({
  /** Free text search across title, description, and tags */
  search: z.string().max(200).optional(),

  /** Filter by resource type(s) */
  resource_type: z.union([resourceTypeSchema, z.array(resourceTypeSchema)]).optional(),

  /** Filter by category(s) */
  category: z.union([resourceCategorySchema, z.array(resourceCategorySchema)]).optional(),

  /** Filter by status */
  status: resourceStatusSchema.optional(),

  /** Filter by tag (exact match) */
  tag: z.string().max(50).optional(),

  /** Filter by author UUID */
  author_id: z.string().uuid().optional(),

  /** Filter by department UUID (from targeting) */
  department_id: z.string().uuid().optional(),

  /** Only show featured resources */
  is_featured: z.coerce.boolean().optional(),

  /** Only show pinned resources */
  is_pinned: z.coerce.boolean().optional(),

  /** Only show public resources */
  is_public: z.coerce.boolean().optional(),

  /** Filter resources published after this date */
  published_after: z.string().datetime().optional(),

  /** Filter resources published before this date */
  published_before: z.string().datetime().optional(),

  /** Sort field */
  sort_by: resourceSortFieldSchema.default('created_at'),

  /** Sort direction */
  sort_direction: sortDirectionSchema.default('desc'),

  /** Page number (1-based) */
  page: z.coerce.number().int().positive().default(1),

  /** Items per page */
  page_size: pageSizeSchema,
});

// ============================================
// Inferred Types
// ============================================

/** Validated resource filter parameters */
export type ResourceFilterInput = z.infer<typeof resourceFilterSchema>;

/** Sort field values */
export type ResourceSortField = z.infer<typeof resourceSortFieldSchema>;
