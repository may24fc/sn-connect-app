import { z } from 'zod';

const SUPPORTED_CURRENCIES = ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'] as const;

export const expenseVerifySchema = z.object({
  verifiedDebitAccount: z.string().min(1, 'Debit account is required'),
  verifiedCreditAccount: z.string().min(1, 'Credit account is required'),
  sourceCurrency: z.enum(SUPPORTED_CURRENCIES),
  reviewerNotes: z.string().optional().nullable(),
  taxAmount: z.number().nonnegative().optional().nullable(),
  totalAmount: z.number().positive().optional().nullable(),
  exchangeRateToAud: z.number().positive().optional().nullable(),
});

export type ExpenseVerifyInput = z.infer<typeof expenseVerifySchema>;
