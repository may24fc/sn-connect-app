/**
 * Shared report type info, labels, and utilities used across all report pages.
 */

import {
  marketingPrimaryChannelValues,
  marketingContextSchema,
  type MarketingCampaignType,
  type MarketingContext,
  type MarketingObjective,
  type MarketingPrimaryChannel,
} from '@/lib/schemas/report.schema';

export type MarketingCampaignFilterValue = 'all' | MarketingCampaignType;
export type MarketingObjectiveFilterValue = 'all' | MarketingObjective;
export type MarketingMetricAnalyticsCategory = 'spend' | 'outcome' | 'supporting';

export const REPORT_TYPE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  weekly: {
    label: 'Weekly',
    description: 'Summarize your weekly activities, accomplishments, and plans for next week.',
    icon: '📅',
  },
  monthly: {
    label: 'Monthly',
    description: 'Provide a comprehensive overview of the month including key metrics and milestones.',
    icon: '📊',
  },
  marketing: {
    label: 'Marketing',
    description: 'Track campaign performance metrics like clicks, impressions, conversions, and costs.',
    icon: '📈',
  },
};

export const MARKETING_CAMPAIGN_TYPE_OPTIONS: Array<{
  value: MarketingCampaignType;
  label: string;
  description: string;
}> = [
  {
    value: 'awareness',
    label: 'Awareness',
    description: 'Top-of-funnel campaigns built to maximize recall, reach, and visibility.',
  },
  {
    value: 'consideration',
    label: 'Consideration',
    description: 'Mid-funnel campaigns focused on traffic, engagement, leads, app installs, and conversations.',
  },
  {
    value: 'conversion',
    label: 'Conversion',
    description: 'Bottom-funnel campaigns optimized for purchases, conversions, and store visits.',
  },
];

export const MARKETING_PRIMARY_CHANNEL_OPTIONS: Array<{
  value: MarketingPrimaryChannel;
  label: string;
  description: string;
}> = marketingPrimaryChannelValues.map((channel) => ({
  value: channel,
  label: channel,
  description:
    channel === 'Google Ads'
      ? 'Use for campaigns managed in Google Ads, including Search, Display, YouTube, and Performance Max.'
      : 'Use for campaigns managed across Meta placements, including Facebook and Instagram ads.',
}));

export const MARKETING_OBJECTIVE_INFO: Record<
  MarketingObjective,
  { label: string; description: string }
> = {
  brand_awareness: {
    label: 'Brand Awareness',
    description: 'Measure ad recall and broad brand visibility.',
  },
  reach: {
    label: 'Reach',
    description: 'Maximize the number of people exposed to the campaign.',
  },
  traffic: {
    label: 'Traffic',
    description: 'Drive visits and landing page activity.',
  },
  engagement: {
    label: 'Engagement',
    description: 'Increase interactions across social content and community actions.',
  },
  app_installs: {
    label: 'App Installs',
    description: 'Optimize for installs and early in-app activity.',
  },
  video_views: {
    label: 'Video Views',
    description: 'Track watch behavior and attention on video creative.',
  },
  lead_generation: {
    label: 'Lead Generation',
    description: 'Capture submitted leads and measure lead quality.',
  },
  messages: {
    label: 'Messages',
    description: 'Generate direct conversations and message interactions.',
  },
  conversions: {
    label: 'Conversions',
    description: 'Track actions that directly drive purchases or conversion events.',
  },
  catalog_sales: {
    label: 'Catalog Sales',
    description: 'Measure product-led commerce outcomes and purchase efficiency.',
  },
  store_traffic: {
    label: 'Store Traffic',
    description: 'Track visits and in-location engagement for physical destinations.',
  },
};

const MARKETING_OBJECTIVES_BY_CAMPAIGN_TYPE: Record<
  MarketingCampaignType,
  Array<MarketingObjective>
> = {
  awareness: ['brand_awareness', 'reach'],
  consideration: ['traffic', 'engagement', 'app_installs', 'video_views', 'lead_generation', 'messages'],
  conversion: ['conversions', 'catalog_sales', 'store_traffic'],
};

export interface MarketingMetricTemplate {
  name: string;
  value: string;
  unit: string;
  locked: boolean;
  analyticsCategory: MarketingMetricAnalyticsCategory;
}

interface MarketingMetricLike {
  metric_name: string;
  metric_value: number;
  metric_unit?: string | null;
}

function normalizeMetricUnit(unit: string | null | undefined): string {
  return unit?.trim().toLowerCase() ?? '';
}

export function formatMetricValue(value: number, unit?: string | null): string {
  const normalizedUnit = normalizeMetricUnit(unit);

  if (normalizedUnit === 'count') {
    return Math.round(value).toLocaleString('en-US');
  }

  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatMetricValueWithUnit(value: number, unit?: string | null): string {
  const normalizedUnit = normalizeMetricUnit(unit);
  const formattedValue = formatMetricValue(value, unit);

  if (!normalizedUnit) {
    return formattedValue;
  }

  if (normalizedUnit === 'php' || normalizedUnit === 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (normalizedUnit === '%') {
    return `${formattedValue}%`;
  }

  if (normalizedUnit === 'x') {
    return `${formattedValue}x`;
  }

  return `${formattedValue} ${unit}`;
}

export function formatUsdAmount(value: number): string {
  return formatMetricValueWithUnit(value, 'USD');
}

function createLockedMetric(
  name: string,
  unit: string,
  analyticsCategory: MarketingMetricAnalyticsCategory
): MarketingMetricTemplate {
  return {
    name,
    value: '0',
    unit,
    locked: true,
    analyticsCategory,
  };
}

const MARKETING_METRIC_PRESETS: Record<MarketingObjective, Array<MarketingMetricTemplate>> = {
  brand_awareness: [
    createLockedMetric('Ad Recall Lift', '%', 'supporting'),
    createLockedMetric('Reach', 'count', 'outcome'),
    createLockedMetric('Impressions', 'count', 'supporting'),
    createLockedMetric('Frequency', 'x', 'supporting'),
    createLockedMetric('CPM', 'USD', 'spend'),
  ],
  reach: [
    createLockedMetric('Impressions', 'count', 'supporting'),
    createLockedMetric('Reach', 'count', 'outcome'),
    createLockedMetric('Frequency', 'x', 'supporting'),
    createLockedMetric('CPM', 'USD', 'spend'),
    createLockedMetric('Unique Reach', 'count', 'supporting'),
  ],
  traffic: [
    createLockedMetric('Link Clicks', 'count', 'outcome'),
    createLockedMetric('Landing Page Views', 'count', 'outcome'),
    createLockedMetric('CTR', '%', 'supporting'),
    createLockedMetric('CPC', 'USD', 'spend'),
    createLockedMetric('Sessions', 'count', 'supporting'),
    createLockedMetric('Bounce Rate', '%', 'supporting'),
  ],
  engagement: [
    createLockedMetric('Reactions', 'count', 'outcome'),
    createLockedMetric('Comments', 'count', 'outcome'),
    createLockedMetric('Shares', 'count', 'outcome'),
    createLockedMetric('Page Likes', 'count', 'supporting'),
    createLockedMetric('Event Responses', 'count', 'supporting'),
    createLockedMetric('Engagement Rate', '%', 'supporting'),
    createLockedMetric('Cost per Engagement', 'USD', 'spend'),
  ],
  app_installs: [
    createLockedMetric('Installs', 'count', 'outcome'),
    createLockedMetric('CPI', 'USD', 'spend'),
    createLockedMetric('Retention Rate', '%', 'supporting'),
    createLockedMetric('In-App Events', 'count', 'supporting'),
  ],
  video_views: [
    createLockedMetric('Video Plays (2s/3s/10s)', 'count', 'outcome'),
    createLockedMetric('ThruPlay', 'count', 'outcome'),
    createLockedMetric('Cost per View', 'USD', 'spend'),
    createLockedMetric('Avg Watch Time', 'seconds', 'supporting'),
    createLockedMetric('Audience Retention', '%', 'supporting'),
  ],
  lead_generation: [
    createLockedMetric('Leads Submitted', 'count', 'outcome'),
    createLockedMetric('CPL', 'USD', 'spend'),
    createLockedMetric('Form Completion Rate', '%', 'supporting'),
    createLockedMetric('Click-to-Lead Conversion Rate', '%', 'supporting'),
  ],
  messages: [
    createLockedMetric('Conversations Started', 'count', 'outcome'),
    createLockedMetric('Response Rate', '%', 'supporting'),
    createLockedMetric('Cost per Conversation', 'USD', 'spend'),
    createLockedMetric('Message Open/Click Rate', '%', 'supporting'),
  ],
  conversions: [
    createLockedMetric('Conversions', 'count', 'outcome'),
    createLockedMetric('Cost per Conversion', 'USD', 'spend'),
    createLockedMetric('ROAS', 'x', 'supporting'),
    createLockedMetric('Conversion Rate', '%', 'supporting'),
    createLockedMetric('Add to Cart/Purchase Events', 'count', 'supporting'),
  ],
  catalog_sales: [
    createLockedMetric('Purchases', 'count', 'outcome'),
    createLockedMetric('Cost per Purchase', 'USD', 'spend'),
    createLockedMetric('ROAS', 'x', 'supporting'),
    createLockedMetric('CTR', '%', 'supporting'),
    createLockedMetric('Product Engagement', 'count', 'supporting'),
  ],
  store_traffic: [
    createLockedMetric('Store Visits', 'count', 'outcome'),
    createLockedMetric('Cost per Store Visit', 'USD', 'spend'),
    createLockedMetric('Check-ins', 'count', 'supporting'),
    createLockedMetric('Reach within Location', 'count', 'supporting'),
  ],
};

function normalizeMetricName(metricName: string): string {
  return metricName.trim().toLowerCase();
}

const MARKETING_METRIC_ANALYTICS_LOOKUP = new Map<string, MarketingMetricAnalyticsCategory>(
  Object.values(MARKETING_METRIC_PRESETS)
    .flat()
    .map((metric) => [normalizeMetricName(metric.name), metric.analyticsCategory])
);

function getMetricNumericValue(
  metrics: Array<MarketingMetricLike>,
  metricNames: string | Array<string>
): number | null {
  const candidateNames = Array.isArray(metricNames) ? metricNames : [metricNames];

  for (const metricName of candidateNames) {
    const match = metrics.find((metric) => normalizeMetricName(metric.metric_name) === normalizeMetricName(metricName));
    if (match && Number.isFinite(match.metric_value) && match.metric_value > 0) {
      return match.metric_value;
    }
  }

  return null;
}

export function deriveMarketingSpendFromMetrics(
  metrics: Array<MarketingMetricLike> | null | undefined
): number | null {
  if (!metrics || metrics.length === 0) {
    return null;
  }

  const safeMetrics = metrics.filter(
    (metric) => metric.metric_name && Number.isFinite(metric.metric_value) && metric.metric_value > 0
  );

  if (safeMetrics.length === 0) {
    return null;
  }

  const directSpendMetric = safeMetrics.find(
    (metric) => normalizeMetricName(metric.metric_name) === 'total spend'
  );

  if (directSpendMetric) {
    return directSpendMetric.metric_value;
  }

  const derivedFormulas: Array<{ spendMetric: string; driverMetric: string | Array<string>; divisor?: number; aggregate?: 'sum' | 'max' }> = [
    { spendMetric: 'CPM', driverMetric: 'Impressions', divisor: 1000 },
  ];

  for (const formula of derivedFormulas) {
    const spendRate = getMetricNumericValue(safeMetrics, formula.spendMetric);

    if (!spendRate) {
      continue;
    }

    let driverValue: number | null = null;

    if (Array.isArray(formula.driverMetric)) {
      const driverValues = formula.driverMetric
        .map((metricName) => getMetricNumericValue(safeMetrics, metricName))
        .filter((value): value is number => value !== null);

      if (driverValues.length > 0) {
        driverValue = formula.aggregate === 'max'
          ? Math.max(...driverValues)
          : driverValues.reduce((sum, value) => sum + value, 0);
      }
    } else {
      driverValue = getMetricNumericValue(safeMetrics, formula.driverMetric);
    }

    if (!driverValue || driverValue <= 0) {
      continue;
    }

    const divisor = formula.divisor ?? 1;
    const derivedSpend = (spendRate * driverValue) / divisor;

    if (Number.isFinite(derivedSpend) && derivedSpend > 0) {
      return derivedSpend;
    }
  }

  return null;
}

export function hydrateMarketingContextWithDerivedSpend(
  marketingContext: MarketingContext | null | undefined,
  metrics: Array<MarketingMetricLike> | null | undefined
): MarketingContext | null {
  if (!marketingContext) {
    return null;
  }

  if (marketingContext.totalSpend > 0) {
    return marketingContext;
  }

  const derivedSpend = deriveMarketingSpendFromMetrics(metrics);

  if (!derivedSpend || derivedSpend <= 0) {
    return marketingContext;
  }

  return {
    ...marketingContext,
    totalSpend: derivedSpend,
  };
}

const AWARENESS_OBJECTIVES = new Set<string>(['brand_awareness', 'reach']);
const CONSIDERATION_OBJECTIVES = new Set<string>([
  'traffic',
  'engagement',
  'app_installs',
  'video_views',
  'lead_generation',
  'messages',
]);
const CONVERSION_OBJECTIVES = new Set<string>(['conversions', 'catalog_sales', 'store_traffic']);

const LEGACY_OBJECTIVE_MAP: Record<string, MarketingObjective> = {
  awareness: 'brand_awareness',
  engagement: 'engagement',
  traffic: 'traffic',
  lead_generation: 'lead_generation',
  conversion: 'conversions',
  retention: 'conversions',
};

const LEGACY_CAMPAIGN_TYPE_MAP: Record<string, MarketingCampaignType> = {
  paid_social: 'consideration',
  organic_social: 'consideration',
  search: 'consideration',
  email: 'consideration',
  content: 'consideration',
  partnerships: 'consideration',
  events: 'awareness',
  retention: 'conversion',
};

const MARKETING_CONTEXT_START = '[marketing_context]';
const MARKETING_CONTEXT_END = '[/marketing_context]';

/** Get a human-readable label for a report type, falling back to title case */
export function getReportTypeLabel(reportType: string): string {
  return REPORT_TYPE_INFO[reportType]?.label ?? reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Get the description for a report type */
export function getReportTypeDescription(reportType: string): string | undefined {
  return REPORT_TYPE_INFO[reportType]?.description;
}

export function getMarketingCampaignTypeLabel(campaignType: MarketingCampaignType): string {
  return MARKETING_CAMPAIGN_TYPE_OPTIONS.find((option) => option.value === campaignType)?.label
    ?? campaignType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getMarketingObjectiveLabel(objective: MarketingObjective): string {
  return MARKETING_OBJECTIVE_INFO[objective]?.label
    ?? objective.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getMarketingObjectivesForCampaignType(
  campaignType: MarketingCampaignType
): Array<MarketingObjective> {
  return MARKETING_OBJECTIVES_BY_CAMPAIGN_TYPE[campaignType] ?? ['brand_awareness'];
}

export function createMarketingMetricPreset(
  objective: MarketingObjective
): Array<MarketingMetricTemplate> {
  return (MARKETING_METRIC_PRESETS[objective] ?? MARKETING_METRIC_PRESETS.brand_awareness).map((metric) => ({ ...metric }));
}

export function getMarketingMetricAnalyticsCategory(
  metricName: string | null | undefined
): MarketingMetricAnalyticsCategory | null {
  if (!metricName) {
    return null;
  }

  return MARKETING_METRIC_ANALYTICS_LOOKUP.get(normalizeMetricName(metricName)) ?? null;
}

function normalizeMarketingContextPayload(payload: unknown): MarketingContext | null {
  const directMatch = marketingContextSchema.safeParse(payload);
  if (directMatch.success) {
    return directMatch.data;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const rawCampaignType =
    typeof candidate.campaignType === 'string' ? candidate.campaignType.trim().toLowerCase() : '';
  const rawObjective =
    typeof candidate.objective === 'string' ? candidate.objective.trim().toLowerCase() : '';

  const normalizedObjective = (LEGACY_OBJECTIVE_MAP[rawObjective] ?? rawObjective) as MarketingObjective;

  let normalizedCampaignType = rawCampaignType as MarketingCampaignType;

  if (!MARKETING_CAMPAIGN_TYPE_OPTIONS.some((option) => option.value === normalizedCampaignType)) {
    normalizedCampaignType = LEGACY_CAMPAIGN_TYPE_MAP[rawCampaignType] ?? normalizedCampaignType;
  }

  if (!MARKETING_CAMPAIGN_TYPE_OPTIONS.some((option) => option.value === normalizedCampaignType)) {
    if (AWARENESS_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'awareness';
    } else if (CONSIDERATION_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'consideration';
    } else if (CONVERSION_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'conversion';
    }
  }

  const normalized = marketingContextSchema.safeParse({
    ...candidate,
    campaignType: normalizedCampaignType,
    objective: normalizedObjective,
  });

  return normalized.success ? normalized.data : null;
}

export function buildNarrativeReportNotes({
  summary,
  accomplishments,
  challenges,
  nextWeekPlans,
}: {
  summary?: string;
  accomplishments?: Array<string>;
  challenges?: Array<string>;
  nextWeekPlans?: Array<string>;
}): string | undefined {
  const parts: Array<string> = [];

  if (summary?.trim()) {
    parts.push(summary.trim());
  }

  const accomplishmentItems = (accomplishments ?? []).filter((item) => item.trim());
  if (accomplishmentItems.length > 0) {
    parts.push(`Accomplishments:\n${accomplishmentItems.map((item) => `- ${item}`).join('\n')}`);
  }

  const challengeItems = (challenges ?? []).filter((item) => item.trim());
  if (challengeItems.length > 0) {
    parts.push(`Challenges:\n${challengeItems.map((item) => `- ${item}`).join('\n')}`);
  }

  const nextStepItems = (nextWeekPlans ?? []).filter((item) => item.trim());
  if (nextStepItems.length > 0) {
      parts.push(`Next Steps:\n${nextStepItems.map((item) => `- ${item}`).join('\n')}`);
  }

  return parts.join('\n\n') || undefined;
}

export function serializeReportNotes(
  notes: string | null | undefined,
  marketingContext?: MarketingContext | null
): string | null {
  const cleanNotes = notes?.trim() ?? '';

  if (!marketingContext) {
    return cleanNotes || null;
  }

  const contextBlock = `${MARKETING_CONTEXT_START}\n${JSON.stringify(marketingContext)}\n${MARKETING_CONTEXT_END}`;

  return cleanNotes ? `${contextBlock}\n\n${cleanNotes}` : contextBlock;
}

export function extractMarketingContext(notes: string | null | undefined): {
  marketingContext: MarketingContext | null;
  cleanNotes: string;
} {
  const rawNotes = notes?.trim() ?? '';

  if (!rawNotes) {
    return { marketingContext: null, cleanNotes: '' };
  }

  const startIndex = rawNotes.indexOf(MARKETING_CONTEXT_START);
  const endIndex = rawNotes.indexOf(MARKETING_CONTEXT_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return { marketingContext: null, cleanNotes: rawNotes };
  }

  const jsonStart = startIndex + MARKETING_CONTEXT_START.length;
  const jsonText = rawNotes.slice(jsonStart, endIndex).trim();
  const before = rawNotes.slice(0, startIndex).trim();
  const after = rawNotes.slice(endIndex + MARKETING_CONTEXT_END.length).trim();
  const cleanNotes = [before, after].filter(Boolean).join('\n\n').trim();

  try {
    const parsedJson = JSON.parse(jsonText);
    const parsedContext = normalizeMarketingContextPayload(parsedJson);

    return {
      marketingContext: parsedContext,
      cleanNotes,
    };
  } catch {
    return {
      marketingContext: null,
      cleanNotes,
    };
  }
}

export function normalizeReportRecord<
  T extends {
    notes: string | null;
    report_metrics?: Array<MarketingMetricLike> | null;
  },
>(report: T): Omit<T, 'notes'> & {
  notes: string | null;
  marketing_context: MarketingContext | null;
} {
  const { marketingContext, cleanNotes } = extractMarketingContext(report.notes);
  const hydratedMarketingContext = hydrateMarketingContextWithDerivedSpend(
    marketingContext,
    report.report_metrics ?? null
  );

  return {
    ...report,
    notes: cleanNotes || null,
    marketing_context: hydratedMarketingContext,
  };
}

export function getMarketingReportDisplayName(
  marketingContext: MarketingContext | null | undefined
): string {
  return marketingContext?.campaignName?.trim() || 'Untitled Campaign';
}

export function getMarketingReportContextSummary(
  marketingContext: MarketingContext | null | undefined
): string {
  if (!marketingContext) {
    return 'Campaign details unavailable';
  }

  return `${getMarketingObjectiveLabel(marketingContext.objective)} via ${marketingContext.primaryChannel}`;
}

export function matchesMarketingReportFilters(
  report: {
    notes: string | null;
    marketing_context: MarketingContext | null;
    employees?: {
      first_name: string;
      last_name: string;
      department: string;
    };
  },
  filters: {
    campaignType?: MarketingCampaignFilterValue;
    objective?: MarketingObjectiveFilterValue;
    search?: string;
  }
): boolean {
  const { campaignType = 'all', objective = 'all', search = '' } = filters;
  const marketingContext = report.marketing_context;
  const normalizedSearch = search.trim().toLowerCase();

  if (campaignType !== 'all' && marketingContext?.campaignType !== campaignType) {
    return false;
  }

  if (objective !== 'all' && marketingContext?.objective !== objective) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  const haystack = [
    report.employees ? `${report.employees.first_name} ${report.employees.last_name}` : '',
    report.employees?.department || '',
    report.notes || '',
    marketingContext?.campaignName || '',
    marketingContext?.totalSpend?.toString() || '',
    marketingContext?.primaryChannel || '',
    marketingContext?.targetAudience || '',
    marketingContext?.campaignType
      ? getMarketingCampaignTypeLabel(marketingContext.campaignType)
      : '',
    marketingContext?.objective
      ? getMarketingObjectiveLabel(marketingContext.objective)
      : '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

/**
 * Parse structured sections from report notes.
 * Supports sections marked with headers like "Accomplishments:", "Challenges:", "Next Steps:"
 */
export function parseNoteSections(notes: string): {
  summary: string;
  accomplishments: Array<string>;
  challenges: Array<string>;
  nextWeekPlans: Array<string>;
} {
  const result = {
    summary: '',
    accomplishments: [] as Array<string>,
    challenges: [] as Array<string>,
    nextWeekPlans: [] as Array<string>,
  };

  if (!notes) return result;

  const { cleanNotes } = extractMarketingContext(notes);

  if (!cleanNotes) return result;

  const sections = cleanNotes.split(/\n(?=(?:accomplishments|challenges|next\s*(?:steps|week\s*plans)):\s*)/i);

  for (const section of sections) {
    const trimmed = section.trim();
    if (/^accomplishments:/i.test(trimmed)) {
      result.accomplishments = parseListItems(trimmed.replace(/^accomplishments:\s*/i, ''));
    } else if (/^challenges:/i.test(trimmed)) {
      result.challenges = parseListItems(trimmed.replace(/^challenges:\s*/i, ''));
    } else if (/^next\s*(?:steps|week\s*plans):/i.test(trimmed)) {
      result.nextWeekPlans = parseListItems(trimmed.replace(/^next\s*(?:steps|week\s*plans):\s*/i, ''));
    } else if (!result.summary) {
      result.summary = trimmed;
    }
  }

  if (!result.summary && result.accomplishments.length === 0) {
    result.summary = cleanNotes;
  }

  return result;
}

function parseListItems(text: string): Array<string> {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').trim())
    .filter(Boolean);
}
