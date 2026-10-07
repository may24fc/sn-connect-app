import { z } from 'zod';
import { FINANCE_CATEGORIES } from '@/lib/finance/categories';

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
  verifiedDebitAccount: z.string().min(1, 'Debit account is required').max(255),
  verifiedCreditAccount: z.string().min(1, 'Credit account is required').max(255),
  sourceCurrency: z.enum(SUPPORTED_CURRENCIES),
  reviewerNotes: z.string().max(2000).optional().nullable(),
  taxAmount: z.number().nonnegative().optional().nullable(),
  totalAmount: z.number().positive().optional().nullable(),
  exchangeRateToAud: z.number().positive().optional().nullable(),
});

export type ExpenseVerifyInput = z.infer<typeof expenseVerifySchema>;

/**
 * Manual spend REQUEST logging. Used by all staff/interns; no receipt required.
 */
export const expenseLogRequestSchema = z.object({
  vendorName: z.string().min(1, 'Vendor / service name is required').max(255),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  expenseType: z.enum(EXPENSE_TYPES),
  categoryCode: z.enum(FINANCE_CATEGORIES.map((category) => category.code) as [string, ...string[]]).optional(),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  taxAmount: z.number().nonnegative().optional().nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  businessJustification: z.string().max(2000).optional().nullable(),
});

export type ExpenseLogRequestInput = z.infer<typeof expenseLogRequestSchema>;

/**
 * Reconciliation action performed by Accounting/Admin in the Matching Queue.
 * Links a request entry with its counterpart payment entry (or vice-versa).
 */
export const expenseMatchSchema = z.object({
  counterpartEntryId: z.string().uuid('A counterpart entry must be selected'),
  matchStatus: z.enum(['matched', 'variance_flagged', 'resolved']),
  matchedNotes: z.string().max(2000).optional().nullable(),
});

export type ExpenseMatchInput = z.infer<typeof expenseMatchSchema>;
