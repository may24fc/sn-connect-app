import {
  requiresMarketingCampaignType,
  requiresMarketingObjective,
} from '@/lib/marketing-report-config';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const reportStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);

export const reportTypeSchema = z.enum(['weekly', 'monthly', 'marketing']);

export const marketingCampaignTypeSchema = z.enum([
  'awareness',
  'consideration',
  'conversion',
  'search',
  'display',
  'performance_max',
  'shopping',
  'video',
  'demand_gen',
  'app_campaign',
  'local_campaign',
  'discovery_demand_gen',
  'remarketing',
  'brand_campaign',
  'competitor_campaign',
  'dynamic_search_ads',
  'call_only_campaign',
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
  'purchases',
  'catalog_sales',
  'store_traffic',
  'website_traffic',
  'phone_calls',
  'remarketing',
  'multi_channel_conversions',
  'ecommerce_sales',
  'video_engagement',
  'prospecting_engagement',
  'app_promotion',
  'traffic_conversions',
  're_engagement',
  'brand_protection',
  'market_capture',
  'search_expansion',
  'direct_calls',
]);

export const marketingReportTypeValues = [
  'Facebook Ads',
  'Google Ads',
  'Email Marketing',
  'Content Creation',
] as const;

export const marketingReportTypeSchema = z.enum(marketingReportTypeValues, {
  errorMap: () => ({ message: 'Select a marketing report type' }),
});

export const marketingPrimaryChannelValues = ['Google Ads', 'Meta Ads'] as const;

export const marketingPrimaryChannelSchema = z.enum(marketingPrimaryChannelValues, {
  errorMap: () => ({ message: 'Select either Google Ads or Meta Ads' }),
});

export const marketingSubmissionKindValues = ['weekly_summary', 'weekly_plan'] as const;

export const marketingSubmissionKindSchema = z.enum(marketingSubmissionKindValues);

export const contentCreationEntrySchema = z.object({
  platform: z.string().trim().min(1, 'Platform or app is required').max(80),
  posts: z.coerce.number().int().min(0, 'Posts cannot be negative'),
});

export const contentCreationDetailsSchema = z.object({
  entries: z.array(contentCreationEntrySchema).default([]),
  results: z.string().trim().max(5000).optional().nullable(),
  observations: z.string().trim().max(5000).optional().nullable(),
});

export const weeklyPlanItemSchema = z.string().trim().min(1, 'Plan item is required').max(300);

export const weeklyPlanDetailsSchema = z.object({
  items: z.array(weeklyPlanItemSchema).max(50).default([]),
});

export const marketingContextSchema = z.object({
  submissionKind: marketingSubmissionKindSchema.optional().nullable(),
  marketingReportType: marketingReportTypeSchema.optional().nullable(),
  campaignName: z.string().trim().max(120).optional().nullable(),
  campaignType: marketingCampaignTypeSchema.optional().nullable(),
  objective: marketingObjectiveSchema.optional().nullable(),
  objectives: z.array(marketingObjectiveSchema).max(10).optional().nullable(),
  totalSpend: z.coerce.number().min(0, 'Total spend cannot be negative').optional().nullable(),
  primaryChannel: marketingPrimaryChannelSchema.optional().nullable(),
  targetAudience: z.string().trim().max(160).optional().nullable(),
  contentCreation: contentCreationDetailsSchema.optional().nullable(),
  weeklyPlan: weeklyPlanDetailsSchema.optional().nullable(),
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
  if (payload.reportType !== 'marketing') {
    return;
  }

  if (!payload.marketingContext) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['marketingContext'],
      message: 'Marketing context is required for marketing reports',
    });
    return;
  }

  const submissionKind = payload.marketingContext.submissionKind ?? 'weekly_summary';

  if (submissionKind === 'weekly_plan') {
    if ((payload.marketingContext.weeklyPlan?.items ?? []).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marketingContext', 'weeklyPlan', 'items'],
        message: 'Add at least one weekly plan item',
      });
    }

    return;
  }

  if (!payload.marketingContext.marketingReportType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['marketingContext', 'marketingReportType'],
      message: 'Marketing report type is required',
    });

    return;
  }

  if (
    requiresMarketingCampaignType(payload.marketingContext.marketingReportType)
    && !payload.marketingContext.campaignType
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['marketingContext', 'campaignType'],
      message: 'Campaign type is required for this report type',
    });
  }

  if (
    requiresMarketingObjective(payload.marketingContext.marketingReportType)
  ) {
    if (payload.marketingContext.marketingReportType === 'Google Ads') {
      const selectedObjectives = payload.marketingContext.objectives ?? [];

      if (selectedObjectives.length === 0 && !payload.marketingContext.objective) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['marketingContext', 'objectives'],
          message: 'At least one objective is required for Google Ads reports',
        });
      }
    } else if (!payload.marketingContext.objective) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marketingContext', 'objective'],
        message: 'Objective is required for this report type',
      });
    }
  }

  if (payload.marketingContext.marketingReportType === 'Content Creation') {
    const contentCreation = payload.marketingContext.contentCreation;

    if (!contentCreation || contentCreation.entries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marketingContext', 'contentCreation', 'entries'],
        message: 'At least one content publishing entry is required',
      });
    }

    if (!contentCreation?.results?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marketingContext', 'contentCreation', 'results'],
        message: 'Results are required for content creation reports',
      });
    }

    if (!contentCreation?.observations?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marketingContext', 'contentCreation', 'observations'],
        message: 'Observations are required for content creation reports',
      });
    }
  }
});

export type ReportInput = z.infer<typeof reportSchema>;
export type ReportMetricInput = z.infer<typeof reportMetricSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type MarketingCampaignType = z.infer<typeof marketingCampaignTypeSchema>;
export type MarketingObjective = z.infer<typeof marketingObjectiveSchema>;
export type MarketingReportType = z.infer<typeof marketingReportTypeSchema>;
export type MarketingPrimaryChannel = z.infer<typeof marketingPrimaryChannelSchema>;
export type MarketingSubmissionKind = z.infer<typeof marketingSubmissionKindSchema>;
export type ContentCreationEntry = z.infer<typeof contentCreationEntrySchema>;
export type ContentCreationDetails = z.infer<typeof contentCreationDetailsSchema>;
export type WeeklyPlanDetails = z.infer<typeof weeklyPlanDetailsSchema>;
export type MarketingContext = z.infer<typeof marketingContextSchema>;
