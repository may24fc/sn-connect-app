import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const invoiceStatusSchema = z.enum(['draft', 'submitted', 'approved', 'paid', 'rejected']);

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  total: z.number().nonnegative('Total cannot be negative'),
});

export const invoiceCreateSchema = z.object({
  employeeId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  grossAmount: z.number().nonnegative(),
  deductions: z.number().nonnegative().default(0),
  netAmount: z.number().nonnegative(),
  status: invoiceStatusSchema.default('draft'),
  notes: z.string().optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).default([]),
  sourceCurrency: z.string().length(3).default('PHP'),
  targetCurrency: z.string().length(3).default('PHP'),
  exchangeRate: z.number().positive().optional().nullable(),
  convertedAmount: z.number().nonnegative().optional().nullable(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const invoiceApprovalSchema = z.object({
  action: z.enum(['approved', 'rejected']).default('approved'),
  notes: z.string().optional().nullable(),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceApprovalInput = z.infer<typeof invoiceApprovalSchema>;
