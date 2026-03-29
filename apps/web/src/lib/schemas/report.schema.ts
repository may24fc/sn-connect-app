import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const reportStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);

export const reportTypeSchema = z.enum(['weekly', 'monthly', 'marketing']);

export const marketingCampaignTypeSchema = z.enum([
  'awareness',
  'consideration',
  'conversion',
]);

export const marketingObjectiveSchema = z.enum([
  'brand_awareness',
  'reach',
  'traffic',
  'engagement',
  'app_installs',
  'video_views',
  'lead_generation',
  'messages',
  'conversions',
  'catalog_sales',
  'store_traffic',
]);

export const marketingContextSchema = z.object({
  campaignName: z.string().trim().min(1, 'Campaign name is required').max(120),
  campaignType: marketingCampaignTypeSchema,
  objective: marketingObjectiveSchema,
  primaryChannel: z.string().trim().min(1, 'Primary channel is required').max(80),
  targetAudience: z.string().trim().min(1, 'Target audience is required').max(160),
});

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
  marketingContext: marketingContextSchema.optional().nullable(),
});

export const reportCreateSchema = reportSchema.extend({
  metrics: z.array(reportMetricSchema).default([]),
}).superRefine((payload, ctx) => {
  if (payload.reportType === 'marketing' && !payload.marketingContext) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['marketingContext'],
      message: 'Marketing context is required for marketing reports',
    });
  }
});

export type ReportInput = z.infer<typeof reportSchema>;
export type ReportMetricInput = z.infer<typeof reportMetricSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type MarketingCampaignType = z.infer<typeof marketingCampaignTypeSchema>;
export type MarketingObjective = z.infer<typeof marketingObjectiveSchema>;
export type MarketingContext = z.infer<typeof marketingContextSchema>;
