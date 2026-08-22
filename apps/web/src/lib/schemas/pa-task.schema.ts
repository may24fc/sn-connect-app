import { z } from 'zod';

export const paTaskAccessLevelSchema = z.enum(['member', 'manager', 'admin']);

export const paTaskColorSchema = z.enum([
  'zinc',
  'sky',
  'amber',
  'rose',
  'emerald',
  'orange',
  'violet',
]);

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

function optionalTextField(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value ?? null;
      }

      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    },
    z.string().max(maxLength).nullable().optional()
  );
}

export const paTaskBaseSchema = z.object({
  title: z.string().trim().min(1, 'Task is required').max(300),
  description: optionalTextField(5000),
  statusId: z.string().uuid('A valid status is required'),
  priorityId: z.string().uuid('A valid priority is required'),
  categoryId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: dateOnlySchema.nullable().optional(),
  dateGiven: dateOnlySchema.nullable().optional(),
  blockerReason: optionalTextField(500),
  waitingOn: optionalTextField(300),
  notes: optionalTextField(5000),
});

export const paTaskCreateSchema = paTaskBaseSchema;
export const paTaskUpdateSchema = paTaskBaseSchema.partial();

export const paTaskFiltersSchema = z.object({
  search: z.string().trim().optional(),
  statusId: z.string().uuid().optional(),
  statusScope: z.enum(['active', 'archive', 'all']).default('all'),
  priorityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  dueStatus: z.enum(['overdue', 'on_time', 'completed', 'no_due_date']).optional(),
  dueDateFrom: dateOnlySchema.optional(),
  dueDateTo: dateOnlySchema.optional(),
  dateGivenFrom: dateOnlySchema.optional(),
  dateGivenTo: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(10).default(10),
  sortBy: z.enum(['updated_at', 'due_date', 'date_given', 'created_at', 'title']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const paTaskLookupCreateSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(100),
  color: paTaskColorSchema.default('zinc'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isDefault: z.coerce.boolean().default(false),
  isTerminal: z.coerce.boolean().optional(),
});

export const paTaskLookupUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  color: paTaskColorSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isDefault: z.coerce.boolean().optional(),
  isTerminal: z.coerce.boolean().optional(),
});

export const paTaskAccessGrantCreateSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
  accessLevel: paTaskAccessLevelSchema.default('member'),
});

export const paTaskAccessGrantDeleteSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
});

const paTaskLinkAttachmentSchema = z.object({
  attachmentType: z.literal('link'),
  title: z.string().trim().max(200).optional(),
  url: z.string().url('A valid URL is required'),
});

const paTaskFileAttachmentSchema = z.object({
  attachmentType: z.literal('file'),
  title: z.string().trim().max(200).optional(),
  storagePath: z.string().trim().min(1, 'storagePath is required'),
  fileSizeBytes: z.coerce.number().int().min(0).nullable().optional(),
  mimeType: z.string().trim().max(120).nullable().optional(),
});

export const paTaskAttachmentCreateSchema = z.union([
  paTaskLinkAttachmentSchema,
  paTaskFileAttachmentSchema,
]);

export const paTaskAttachmentDeleteSchema = z.object({
  attachmentId: z.string().uuid('A valid attachment is required'),
});

export type PaTaskCreateInput = z.infer<typeof paTaskCreateSchema>;
export type PaTaskUpdateInput = z.infer<typeof paTaskUpdateSchema>;
export type PaTaskFiltersInput = z.infer<typeof paTaskFiltersSchema>;
export type PaTaskLookupCreateInput = z.infer<typeof paTaskLookupCreateSchema>;
export type PaTaskLookupUpdateInput = z.infer<typeof paTaskLookupUpdateSchema>;
export type PaTaskAccessGrantCreateInput = z.infer<typeof paTaskAccessGrantCreateSchema>;
export type PaTaskAttachmentCreateInput = z.infer<typeof paTaskAttachmentCreateSchema>;
