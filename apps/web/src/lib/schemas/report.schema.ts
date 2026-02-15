import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const reportStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);

export const reportTypeSchema = z.enum(['weekly', 'monthly', 'marketing']);

export const reportMetricSchema = z.object({
  metricName: z.string().min(1, 'Metric name is required'),
  metricValue: z.number(),
  metricUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const reportSchema = z.object({
  reportType: reportTypeSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  status: reportStatusSchema.default('draft'),
  notes: z.string().optional().nullable(),
});

export const reportCreateSchema = reportSchema.extend({
  metrics: z.array(reportMetricSchema).default([]),
});

export type ReportInput = z.infer<typeof reportSchema>;
export type ReportMetricInput = z.infer<typeof reportMetricSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
