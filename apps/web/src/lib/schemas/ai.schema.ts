import { z } from 'zod';

const chatRoleSchema = z.enum(['user', 'assistant']);

const chatHistoryMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1).max(8000),
});

export const chatMessageSchema = z.object({
  /** Single message string (legacy / simple mode) */
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long').optional(),
  /** Full conversation history (preferred) */
  messages: z.array(chatHistoryMessageSchema).min(1).optional(),
  conversationId: z.string().uuid().optional(),
  includeSourceCitations: z.boolean().optional().default(true),
}).refine(
  (data) => data.message || data.messages,
  { message: 'Either "message" or "messages" is required' }
);

export const createKnowledgeSourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  sourceType: z.enum(['pdf', 'docx', 'txt', 'url', 'manual']),
  content: z.string().min(1, 'Content is required').optional(),
  filePath: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateKnowledgeSourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  sourceType: z.enum(['pdf', 'docx', 'txt', 'url', 'manual']).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  accessLevel: z.enum(['all', 'admin']).optional(),
});

export const knowledgeSourceFiltersSchema = z.object({
  search: z.string().optional(),
  sourceType: z.enum(['pdf', 'docx', 'txt', 'url', 'manual']).optional(),
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

export const aiSuggestionClickSchema = z.object({
  suggestionId: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
  prompt: z.string().min(1).max(500),
  surface: z.enum(['admin_chatbot']).default('admin_chatbot'),
  path: z.string().min(1).max(255),
  conversationId: z.string().uuid().nullable().optional(),
  wasFirstMessage: z.boolean().optional().default(false),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateKnowledgeSourceInput = z.infer<typeof createKnowledgeSourceSchema>;
export type UpdateKnowledgeSourceInput = z.infer<typeof updateKnowledgeSourceSchema>;
export type KnowledgeSourceFilters = z.infer<typeof knowledgeSourceFiltersSchema>;
export type AISuggestionClickInput = z.infer<typeof aiSuggestionClickSchema>;
