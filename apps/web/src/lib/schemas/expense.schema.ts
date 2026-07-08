import { z } from 'zod';

const SUPPORTED_CURRENCIES = ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'] as const;

const EXPENSE_TYPES = [
  'office_supplies',
  'travel',
  'meals',
  'software',
  'equipment',
  'utilities',
  'maintenance',
  'other',
] as const;

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

/**
 * Manual spend REQUEST logging. Used by all staff/interns; no receipt required.
 */
export const expenseLogRequestSchema = z.object({
  vendorName: z.string().min(1, 'Vendor / service name is required'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  expenseType: z.enum(EXPENSE_TYPES),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  taxAmount: z.number().nonnegative().optional().nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  businessJustification: z.string().optional().nullable(),
});

export type ExpenseLogRequestInput = z.infer<typeof expenseLogRequestSchema>;

/**
 * Reconciliation action performed by Accounting/Admin in the Matching Queue.
 * Links a request entry with its counterpart payment entry (or vice-versa).
 */
export const expenseMatchSchema = z.object({
  counterpartEntryId: z.string().uuid('A counterpart entry must be selected'),
  matchStatus: z.enum(['matched', 'variance_flagged', 'resolved']),
  matchedNotes: z.string().optional().nullable(),
});

export type ExpenseMatchInput = z.infer<typeof expenseMatchSchema>;
