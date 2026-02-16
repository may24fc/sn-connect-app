/**
 * Resource Upload Schema - File upload validation
 *
 * Validates file metadata before upload to storage.
 * Enforces size limits, allowed MIME types, and file naming.
 */
import { z } from 'zod';
import { MAX_DOCUMENT_FILE_SIZE, MAX_VIDEO_FILE_SIZE } from './resourceSchema';

// ============================================
// Allowed MIME Types by Resource Type
// ============================================

export const ALLOWED_MIME_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
  ],
} as const;

/** All allowed MIME types flattened */
export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.video,
  ...ALLOWED_MIME_TYPES.document,
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.presentation,
] as const;

// ============================================
// Upload Schema
// ============================================

/**
 * Validates file upload metadata.
 * The actual file binary is handled by the upload middleware;
 * this schema validates the accompanying metadata.
 */
export const resourceUploadSchema = z
  .object({
    /** Original file name */
    file_name: z
      .string()
      .min(1, 'File name is required')
      .max(255, 'File name must be 255 characters or fewer')
      .regex(/^[a-zA-Z0-9_\-. ()]+$/, 'File name contains invalid characters'),

    /** File size in bytes */
    file_size: z.number().int().positive('File size must be greater than 0'),

    /** MIME type of the file */
    mime_type: z
      .string()
      .refine((val) => (ALL_ALLOWED_MIME_TYPES as readonly string[]).includes(val), {
        message: 'File type is not allowed',
      }),

    /** Resource type determines the size limit */
    resource_type: z.enum(['video', 'document', 'image', 'presentation', 'interactive']),
  })
  .refine(
    (data) => {
      const limit = data.resource_type === 'video' ? MAX_VIDEO_FILE_SIZE : MAX_DOCUMENT_FILE_SIZE;
      return data.file_size <= limit;
    },
    {
      message: 'File exceeds size limit (100MB for videos, 50MB for other files)',
      path: ['file_size'],
    }
  );

/**
 * Thumbnail upload schema - images only, max 5MB
 */
export const thumbnailUploadSchema = z.object({
  file_name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_\-. ()]+$/, 'File name contains invalid characters'),
  file_size: z.number().int().positive().max(5_242_880, 'Thumbnail must be 5MB or smaller'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

// ============================================
// Inferred Types
// ============================================

/** Validated file upload metadata */
export type ResourceUploadInput = z.infer<typeof resourceUploadSchema>;

/** Validated thumbnail upload metadata */
export type ThumbnailUploadInput = z.infer<typeof thumbnailUploadSchema>;
