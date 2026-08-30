import { z } from 'zod';

export const AI_SPEND_TYPES = ['api', 'subscription'] as const;
export const AI_EXPENSE_CURRENCIES = ['AUD', 'USD', 'PHP', 'EUR', 'GBP', 'SGD', 'JPY'] as const;

export const aiExpenseCreateSchema = z.object({
  providerId: z.string().uuid('AI provider is required'),
  spendType: z.enum(AI_SPEND_TYPES),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  amountCents: z.number().int('Amount must be a whole number of cents').positive('Amount must be greater than 0'),
  currency: z.enum(AI_EXPENSE_CURRENCIES),
  accountEmail: z.string().trim().min(1, 'Account / Email is required').max(120, 'Account / Email is too long'),
  transactionId: z.string().trim().min(1, 'Transaction ID is required'),
  reason: z.string().trim().min(1, 'Reason is required'),
});

export const aiExpenseUpdateSchema = aiExpenseCreateSchema.partial();

export const aiProviderCreateSchema = z.object({
  name: z.string().trim().min(1, 'Provider name is required').max(60, 'Provider name is too long'),
});

export const aiProviderUpdateSchema = z.object({
  id: z.string().uuid('Provider id is required'),
  name: z.string().trim().min(1, 'Provider name is required').max(60, 'Provider name is too long'),
});

export const aiProviderDeleteSchema = z.object({
  id: z.string().uuid('Provider id is required'),
});

export type AiSpendType = (typeof AI_SPEND_TYPES)[number];
export type AiExpenseCurrency = (typeof AI_EXPENSE_CURRENCIES)[number];
export type AiExpenseCreateInput = z.infer<typeof aiExpenseCreateSchema>;
export type AiExpenseUpdateInput = z.infer<typeof aiExpenseUpdateSchema>;
export type AiProviderCreateInput = z.infer<typeof aiProviderCreateSchema>;
export type AiProviderUpdateInput = z.infer<typeof aiProviderUpdateSchema>;
export type AiProviderDeleteInput = z.infer<typeof aiProviderDeleteSchema>;
