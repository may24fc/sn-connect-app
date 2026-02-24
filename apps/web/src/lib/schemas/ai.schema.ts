import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  includeSourceCitations: z.boolean().optional().default(true),
});

export const createKnowledgeSourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  sourceType: z.enum(['policy', 'handbook', 'faq', 'procedure', 'guideline', 'other']),
  content: z.string().min(1, 'Content is required').optional(),
  filePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateKnowledgeSourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  sourceType: z.enum(['policy', 'handbook', 'faq', 'procedure', 'guideline', 'other']).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const knowledgeSourceFiltersSchema = z.object({
  search: z.string().optional(),
  sourceType: z.enum(['policy', 'handbook', 'faq', 'procedure', 'guideline', 'other']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'title']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateKnowledgeSourceInput = z.infer<typeof createKnowledgeSourceSchema>;
export type UpdateKnowledgeSourceInput = z.infer<typeof updateKnowledgeSourceSchema>;
export type KnowledgeSourceFilters = z.infer<typeof knowledgeSourceFiltersSchema>;
