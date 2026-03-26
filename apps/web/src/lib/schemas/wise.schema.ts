import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// Execute-payroll request schema
// ────────────────────────────────────────────────────────────

export const executePayrollSchema = z.object({
  invoiceId: z.string().uuid('Invoice ID must be a valid UUID'),
  recipientId: z
    .number()
    .int()
    .positive('Wise Recipient ID must be a positive integer'),
  sourceCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  targetCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  sourceAmount: z.number().positive('Amount must be greater than 0'),
  reference: z
    .string()
    .max(140, 'Reference must be at most 140 characters')
    .optional(),
});

export type ExecutePayrollInput = z.infer<typeof executePayrollSchema>;

// ────────────────────────────────────────────────────────────
// Payment status enum (mirrors DB)
// ────────────────────────────────────────────────────────────

export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
