import { z } from 'zod';

export const expenseImportRowSchema = z.object({
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'transactionDate must be in YYYY-MM-DD format'),
  vendorName: z.string().min(1, 'vendorName is required').max(255, 'vendorName is too long'),
  totalAmount: z.number().nonnegative('totalAmount must be greater than or equal to 0'),
  taxAmount: z.number().nonnegative('taxAmount must be greater than or equal to 0').default(0),
  currency: z
    .string()
    .trim()
    .min(1, 'currency is required')
    .max(8, 'currency must be 8 characters or less'),
  businessJustification: z.string().max(2000, 'businessJustification is too long').optional().nullable(),
  aiDebitAccount: z.string().max(255, 'aiDebitAccount is too long').optional().nullable(),
  aiCreditAccount: z.string().max(255, 'aiCreditAccount is too long').optional().nullable(),
});

export type ExpenseImportRow = z.infer<typeof expenseImportRowSchema>;

export const expenseImportBatchSchema = z.object({
  rows: z.array(expenseImportRowSchema).min(1, 'At least one import row is required').max(2000, 'Maximum 2000 rows per import'),
});

export type ExpenseImportBatch = z.infer<typeof expenseImportBatchSchema>;
