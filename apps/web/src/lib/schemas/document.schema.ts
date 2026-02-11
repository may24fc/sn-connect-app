import { DocumentType } from '@hr-portal/database';
import { z } from 'zod';

export const documentMetaSchema = z.object({
  employeeId: z.string().uuid('Employee ID must be a valid UUID'),
  documentType: z.nativeEnum(DocumentType),
  notes: z.string().max(1000).optional().nullable(),
  isConfidential: z.boolean().default(false),
});

export const documentUploadSchema = documentMetaSchema.extend({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().nonnegative('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
