/**
 * Shared report type info, labels, and utilities used across all report pages.
 */

import {
  getMarketingCampaignTypeAvailability,
  getMarketingObjectiveAvailability,
  usesMarketingPresetMetrics,
} from '@/lib/marketing-report-config';
import {
  contentCreationDetailsSchema,
  marketingPrimaryChannelValues,
  marketingContextSchema,
  marketingReportTypeValues,
  type ContentCreationEntry,
  type MarketingCampaignType,
  type MarketingContext,
  type MarketingObjective,
  type MarketingPrimaryChannel,
  type MarketingReportType,
} from '@/lib/schemas/report.schema';

export type MarketingCampaignFilterValue = 'all' | MarketingCampaignType;
export type MarketingObjectiveFilterValue = 'all' | MarketingObjective;
export type MarketingReportTypeFilterValue = 'all' | MarketingReportType;
export type MarketingMetricAnalyticsCategory = 'spend' | 'outcome' | 'supporting';
export const REPORT_CURRENCY_CODE = 'AUD' as const;
export const REPORT_CURRENCY_SYMBOL = 'AU$';

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
  {
    value: 'search',
    label: 'Search',
    description: 'Keyword-targeted Google Ads campaigns focused on search intent and direct response.',
  },
  {
    value: 'display',
    label: 'Display',
    description: 'Google display inventory campaigns for reach, awareness, and remarketing.',
  },
  {
    value: 'performance_max',
    label: 'Performance Max',
    description: 'Multi-channel Google automation campaigns spanning Search, Display, YouTube, Discover, Gmail, and Maps.',
  },
  {
    value: 'shopping',
    label: 'Shopping',
    description: 'Product-led Google campaigns optimized for ecommerce transactions and product visibility.',
  },
  {
    value: 'video',
    label: 'Video',
    description: 'YouTube and video-first Google campaigns built for views, engagement, and lead generation.',
  },
  {
    value: 'demand_gen',
    label: 'Demand Gen',
    description: 'Google demand generation campaigns focused on prospecting and engagement across visual surfaces.',
  },
  {
    value: 'app_campaign',
    label: 'App Campaign',
    description: 'Google app promotion campaigns optimized for installs and in-app actions.',
  },
  {
    value: 'local_campaign',
    label: 'Local Campaign',
    description: 'Local action campaigns optimized for store visits, calls, and on-the-ground conversions.',
  },
  {
    value: 'discovery_demand_gen',
    label: 'Discovery / Demand Gen',
    description: 'Discovery and Demand Gen campaigns aimed at traffic growth and assisted conversions.',
  },
  {
    value: 'remarketing',
    label: 'Remarketing',
    description: 'Re-engagement campaigns targeted at returning users and prior site visitors.',
  },
  {
    value: 'brand_campaign',
    label: 'Brand Campaign',
    description: 'Brand protection campaigns built to defend branded search intent and capture high-intent clicks.',
  },
  {
    value: 'competitor_campaign',
    label: 'Competitor Campaign',
    description: 'Search campaigns aimed at capturing demand from competitor-branded queries.',
  },
  {
    value: 'dynamic_search_ads',
    label: 'Dynamic Search Ads',
    description: 'Automatically generated search campaigns built to expand query coverage beyond exact keyword lists.',
  },
  {
    value: 'call_only_campaign',
    label: 'Call-Only Campaign',
    description: 'Call-driven campaigns designed to generate direct phone inquiries from ad clicks.',
  },
];

const MARKETING_REPORT_TYPE_DESCRIPTIONS: Record<MarketingReportType, string> = {
  'Facebook Ads': 'Paid campaigns running across Facebook and Instagram placements.',
  'Google Ads': 'Search, Display, YouTube, and Performance Max campaign reporting.',
  'Email Marketing': 'Lifecycle, nurture, newsletter, and promotional email performance.',
  'Content Creation': 'Creative production and content output performance reporting.',
};

const MARKETING_REPORT_TYPE_SET = new Set<MarketingReportType>(marketingReportTypeValues);

export const MARKETING_REPORT_TYPE_OPTIONS: Array<{
  value: MarketingReportType;
  label: MarketingReportType;
  description: string;
}> = marketingReportTypeValues.map((reportType) => ({
  value: reportType,
  label: reportType,
  description: MARKETING_REPORT_TYPE_DESCRIPTIONS[reportType],
}));

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
  purchases: {
    label: 'Purchases',
    description: 'Track completed purchases and transaction volume generated from Google Ads campaigns.',
  },
  catalog_sales: {
    label: 'Catalog Sales',
    description: 'Measure product-led commerce outcomes and purchase efficiency.',
  },
  store_traffic: {
    label: 'Store Traffic',
    description: 'Track visits and in-location engagement for physical destinations.',
  },
  website_traffic: {
    label: 'Website Traffic',
    description: 'Drive qualified visits, sessions, and landing page activity from Google Ads campaigns.',
  },
  phone_calls: {
    label: 'Phone Calls',
    description: 'Generate direct calls and measure call-driven conversion performance.',
  },
  remarketing: {
    label: 'Remarketing',
    description: 'Re-engage previous visitors and move returning audiences closer to conversion.',
  },
  multi_channel_conversions: {
    label: 'Multi-Channel Conversions',
    description: 'Drive conversions across Google surfaces using a blended multi-channel delivery strategy.',
  },
  ecommerce_sales: {
    label: 'Ecommerce Sales',
    description: 'Optimize for purchases, order value, and product-led revenue growth.',
  },
  video_engagement: {
    label: 'Video Engagement',
    description: 'Increase views, watch time, and interaction on video creative.',
  },
  prospecting_engagement: {
    label: 'Prospecting & Engagement',
    description: 'Expand audience reach while improving click-through and engagement quality.',
  },
  app_promotion: {
    label: 'App Promotion',
    description: 'Drive installs and valuable in-app actions for mobile app growth.',
  },
  traffic_conversions: {
    label: 'Traffic & Conversions',
    description: 'Balance session growth with conversion capture across discovery-style inventory.',
  },
  re_engagement: {
    label: 'Re-Engagement',
    description: 'Bring previous users back and convert them more efficiently over time.',
  },
  brand_protection: {
    label: 'Brand Protection',
    description: 'Defend branded search demand and preserve impression share on core brand queries.',
  },
  market_capture: {
    label: 'Market Capture',
    description: 'Win competitive search demand and capture incremental qualified traffic.',
  },
  search_expansion: {
    label: 'Search Expansion',
    description: 'Broaden search query coverage while maintaining conversion quality.',
  },
  direct_calls: {
    label: 'Direct Calls',
    description: 'Generate phone inquiries directly from ad placements and call-forwarding assets.',
  },
};

const FACEBOOK_OBJECTIVES_BY_CAMPAIGN_TYPE: Record<
  Extract<MarketingCampaignType, 'awareness' | 'consideration' | 'conversion'>,
  Array<MarketingObjective>
> = {
  awareness: ['brand_awareness', 'reach'],
  consideration: ['traffic', 'engagement', 'app_installs', 'video_views', 'lead_generation', 'messages'],
  conversion: ['conversions', 'catalog_sales', 'store_traffic'],
};

const GOOGLE_SHARED_OBJECTIVES: Array<MarketingObjective> = [
  'purchases',
  'phone_calls',
  'website_traffic',
];

const GOOGLE_OBJECTIVES_BY_CAMPAIGN_TYPE: Record<
  Exclude<
    MarketingCampaignType,
    'awareness' | 'consideration' | 'conversion'
  >,
  Array<MarketingObjective>
> = {
  search: ['lead_generation', 'website_traffic', 'phone_calls'],
  display: ['brand_awareness', 'remarketing'],
  performance_max: ['multi_channel_conversions'],
  shopping: ['ecommerce_sales'],
  video: ['video_engagement', 'lead_generation'],
  demand_gen: ['prospecting_engagement'],
  app_campaign: ['app_promotion'],
  local_campaign: ['store_traffic'],
  discovery_demand_gen: ['traffic_conversions'],
  remarketing: ['re_engagement'],
  brand_campaign: ['brand_protection'],
  competitor_campaign: ['market_capture'],
  dynamic_search_ads: ['search_expansion'],
  call_only_campaign: ['direct_calls'],
};

const MARKETING_CAMPAIGN_TYPES_BY_REPORT_TYPE: Record<MarketingReportType, Array<MarketingCampaignType>> = {
  'Facebook Ads': ['awareness', 'consideration', 'conversion'],
  'Google Ads': [
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
  ],
  'Email Marketing': [],
  'Content Creation': [],
};

export interface MarketingMetricTemplate {
  name: string;
  value: string;
  unit: string;
  locked: boolean;
  analyticsCategory: MarketingMetricAnalyticsCategory;
  displayName?: string;
  groupLabel?: string;
}

interface MarketingMetricLike {
  metric_name: string;
  metric_value: number;
  metric_unit?: string | null;
}

function dedupeMarketingObjectives(
  objectives: Array<MarketingObjective | null | undefined>
): Array<MarketingObjective> {
  return Array.from(new Set(objectives.filter((objective): objective is MarketingObjective => Boolean(objective))));
}

function normalizeContentCreationEntries(
  entries: Array<ContentCreationEntry> | null | undefined
): Array<ContentCreationEntry> {
  return (entries ?? []).filter((entry) => entry.platform.trim().length > 0);
}

export function getContentCreationEntries(
  marketingContext: MarketingContext | null | undefined,
  metrics: Array<MarketingMetricLike> | null | undefined
): Array<ContentCreationEntry> {
  const structuredEntries = normalizeContentCreationEntries(marketingContext?.contentCreation?.entries);

  if (structuredEntries.length > 0) {
    return structuredEntries;
  }

  return (metrics ?? [])
    .filter((metric) => metric.metric_name.trim().length > 0)
    .map((metric) => ({
      platform: metric.metric_name.trim(),
      posts: Math.max(0, Math.round(metric.metric_value ?? 0)),
    }));
}

export function getContentCreationResults(
  marketingContext: MarketingContext | null | undefined,
  parsedNotes: { results: string }
): string {
  return marketingContext?.contentCreation?.results?.trim() || parsedNotes.results.trim();
}

export function getContentCreationObservations(
  marketingContext: MarketingContext | null | undefined,
  parsedNotes: { summary: string }
): string {
  return marketingContext?.contentCreation?.observations?.trim() || parsedNotes.summary.trim();
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

  if (normalizedUnit === 'php') {
    return `Php${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (normalizedUnit === 'usd' || normalizedUnit === 'aud') {
    return `${REPORT_CURRENCY_SYMBOL}${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
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
  return formatMetricValueWithUnit(value, REPORT_CURRENCY_CODE);
}

function createLockedMetric(
  name: string,
  unit: string,
  analyticsCategory: MarketingMetricAnalyticsCategory,
  options?: Pick<MarketingMetricTemplate, 'displayName' | 'groupLabel'>
): MarketingMetricTemplate {
  const metric: MarketingMetricTemplate = {
    name,
    value: '0',
    unit,
    locked: true,
    analyticsCategory,
  };

  if (typeof options?.displayName === 'string') {
    metric.displayName = options.displayName;
  }

  if (typeof options?.groupLabel === 'string') {
    metric.groupLabel = options.groupLabel;
  }

  return metric;
}

const FACEBOOK_MARKETING_METRIC_PRESETS: Partial<Record<MarketingObjective, Array<MarketingMetricTemplate>>> = {
  brand_awareness: [
    createLockedMetric('Ad Recall Lift', '%', 'supporting'),
    createLockedMetric('Reach', 'count', 'outcome'),
    createLockedMetric('Impressions', 'count', 'supporting'),
    createLockedMetric('Frequency', 'x', 'supporting'),
    createLockedMetric('CPM', REPORT_CURRENCY_CODE, 'spend'),
  ],
  reach: [
    createLockedMetric('Impressions', 'count', 'supporting'),
    createLockedMetric('Reach', 'count', 'outcome'),
    createLockedMetric('Frequency', 'x', 'supporting'),
    createLockedMetric('CPM', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Unique Reach', 'count', 'supporting'),
  ],
  traffic: [
    createLockedMetric('Link Clicks', 'count', 'outcome'),
    createLockedMetric('Landing Page Views', 'count', 'outcome'),
    createLockedMetric('CTR', '%', 'supporting'),
    createLockedMetric('CPC', REPORT_CURRENCY_CODE, 'spend'),
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
    createLockedMetric('Cost per Engagement', REPORT_CURRENCY_CODE, 'spend'),
  ],
  app_installs: [
    createLockedMetric('Installs', 'count', 'outcome'),
    createLockedMetric('CPI', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Retention Rate', '%', 'supporting'),
    createLockedMetric('In-App Events', 'count', 'supporting'),
  ],
  video_views: [
    createLockedMetric('Video Plays (2s/3s/10s)', 'count', 'outcome'),
    createLockedMetric('ThruPlay', 'count', 'outcome'),
    createLockedMetric('Cost per View', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Avg Watch Time', 'seconds', 'supporting'),
    createLockedMetric('Audience Retention', '%', 'supporting'),
  ],
  lead_generation: [
    createLockedMetric('Leads Submitted', 'count', 'outcome'),
    createLockedMetric('CPL', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Form Completion Rate', '%', 'supporting'),
    createLockedMetric('Click-to-Lead Conversion Rate', '%', 'supporting'),
  ],
  messages: [
    createLockedMetric('Conversations Started', 'count', 'outcome'),
    createLockedMetric('Response Rate', '%', 'supporting'),
    createLockedMetric('Cost per Conversation', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Message Open/Click Rate', '%', 'supporting'),
  ],
  conversions: [
    createLockedMetric('Conversions', 'count', 'outcome'),
    createLockedMetric('Cost per Conversion', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('ROAS', 'x', 'supporting'),
    createLockedMetric('Conversion Rate', '%', 'supporting'),
    createLockedMetric('Add to Cart/Purchase Events', 'count', 'supporting'),
  ],
  catalog_sales: [
    createLockedMetric('Purchases', 'count', 'outcome'),
    createLockedMetric('Cost per Purchase', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('ROAS', 'x', 'supporting'),
    createLockedMetric('CTR', '%', 'supporting'),
    createLockedMetric('Product Engagement', 'count', 'supporting'),
  ],
  store_traffic: [
    createLockedMetric('Store Visits', 'count', 'outcome'),
    createLockedMetric('Cost per Store Visit', REPORT_CURRENCY_CODE, 'spend'),
    createLockedMetric('Check-ins', 'count', 'supporting'),
    createLockedMetric('Reach within Location', 'count', 'supporting'),
  ],
};

const GOOGLE_MARKETING_METRIC_PRESET: Array<MarketingMetricTemplate> = [
  createLockedMetric('Clicks', 'count', 'outcome'),
  createLockedMetric('Impressions', 'count', 'supporting'),
  createLockedMetric('Conversions', 'count', 'outcome'),
  createLockedMetric('CTR', '%', 'supporting'),
  createLockedMetric('Average CPC', REPORT_CURRENCY_CODE, 'spend'),
  createLockedMetric('CPA', REPORT_CURRENCY_CODE, 'spend'),
];

const EMAIL_MARKETING_METRIC_PRESET: Array<MarketingMetricTemplate> = [
  createLockedMetric('Email Delivery - Delivery Rate', '%', 'supporting', {
    displayName: 'Delivery Rate',
    groupLabel: 'Email Delivery',
  }),
  createLockedMetric('Email Delivery - Bounce Rate', '%', 'supporting', {
    displayName: 'Bounce Rate',
    groupLabel: 'Email Delivery',
  }),
  createLockedMetric('Email Delivery - Unsubscribe Rate', '%', 'supporting', {
    displayName: 'Unsubscribe Rate',
    groupLabel: 'Email Delivery',
  }),
  createLockedMetric('Email Delivery - Spam Complaint Rate', '%', 'supporting', {
    displayName: 'Spam Complaint Rate',
    groupLabel: 'Email Delivery',
  }),
  createLockedMetric('Engagement - Open Rate', '%', 'supporting', {
    displayName: 'Open Rate',
    groupLabel: 'Engagement',
  }),
  createLockedMetric('Engagement - Click-Through Rate', '%', 'supporting', {
    displayName: 'Click-Through Rate',
    groupLabel: 'Engagement',
  }),
  createLockedMetric('Engagement - Click-to-open Rate', '%', 'supporting', {
    displayName: 'Click-to-open Rate',
    groupLabel: 'Engagement',
  }),
];

function normalizeMetricName(metricName: string): string {
  return metricName.trim().toLowerCase();
}

function inferMarketingReportType(
  marketingReportType: unknown,
  campaignName: unknown,
  primaryChannel: unknown
): MarketingReportType | undefined {
  const normalizedReportType =
    typeof marketingReportType === 'string' ? marketingReportType.trim() : '';

  if (MARKETING_REPORT_TYPE_SET.has(normalizedReportType as MarketingReportType)) {
    return normalizedReportType as MarketingReportType;
  }

  const normalizedCampaignName = typeof campaignName === 'string' ? campaignName.trim() : '';

  if (MARKETING_REPORT_TYPE_SET.has(normalizedCampaignName as MarketingReportType)) {
    return normalizedCampaignName as MarketingReportType;
  }

  const normalizedPrimaryChannel = typeof primaryChannel === 'string' ? primaryChannel.trim() : '';

  if (normalizedPrimaryChannel === 'Meta Ads') {
    return 'Facebook Ads';
  }

  if (normalizedPrimaryChannel === 'Google Ads') {
    return 'Google Ads';
  }

  return undefined;
}

const MARKETING_METRIC_ANALYTICS_LOOKUP = new Map<string, MarketingMetricAnalyticsCategory>(
  [
    ...Object.values(FACEBOOK_MARKETING_METRIC_PRESETS),
    GOOGLE_MARKETING_METRIC_PRESET,
    EMAIL_MARKETING_METRIC_PRESET,
  ]
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
  const sanitizedMarketingContext = sanitizeMarketingContext(marketingContext);

  if (!sanitizedMarketingContext) {
    return null;
  }

  if (resolveMarketingReportType(sanitizedMarketingContext) === 'Content Creation') {
    return sanitizedMarketingContext;
  }

  if ((sanitizedMarketingContext.totalSpend ?? 0) > 0) {
    return sanitizedMarketingContext;
  }

  const derivedSpend = deriveMarketingSpendFromMetrics(metrics);

  if (!derivedSpend || derivedSpend <= 0) {
    return sanitizedMarketingContext;
  }

  return {
    ...sanitizedMarketingContext,
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
const CONVERSION_OBJECTIVES = new Set<string>(['conversions', 'purchases', 'catalog_sales', 'store_traffic']);

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

function sanitizeMarketingContext(
  marketingContext: MarketingContext | null | undefined
): MarketingContext | null {
  if (!marketingContext) {
    return null;
  }

  if (resolveMarketingReportType(marketingContext) !== 'Content Creation') {
    return marketingContext;
  }

  const { totalSpend: _totalSpend, ...contentCreationContext } = marketingContext;
  return contentCreationContext;
}

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

export function getMarketingReportTypeLabel(reportType: MarketingReportType): MarketingReportType {
  return reportType;
}

export function resolveMarketingReportType(
  marketingContext:
    | {
        marketingReportType?: string | null | undefined;
        campaignName?: string | null | undefined;
        primaryChannel?: string | null | undefined;
      }
    | null
    | undefined
): MarketingReportType | undefined {
  return inferMarketingReportType(
    marketingContext?.marketingReportType,
    marketingContext?.campaignName,
    marketingContext?.primaryChannel
  );
}

function getSingleMarketingObjectiveLabel(objective: MarketingObjective): string {
  return MARKETING_OBJECTIVE_INFO[objective]?.label
    ?? objective.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export function getMarketingObjectiveLabel(
  objective: MarketingObjective | ReadonlyArray<MarketingObjective>
): string {
  if (Array.isArray(objective)) {
    return objective.map((value) => getSingleMarketingObjectiveLabel(value)).join(', ');
  }

  const singleObjective = objective as MarketingObjective;
  return getSingleMarketingObjectiveLabel(singleObjective);
}

export function getMarketingObjectives(
  marketingContext:
    | Pick<MarketingContext, 'objective' | 'objectives'>
    | null
    | undefined
): Array<MarketingObjective> {
  return dedupeMarketingObjectives([
    ...(marketingContext?.objectives ?? []),
    marketingContext?.objective ?? null,
  ]);
}

export function getMarketingObjectiveSummaryLabel(
  marketingContext:
    | Pick<MarketingContext, 'objective' | 'objectives'>
    | null
    | undefined
): string | null {
  const objectives = getMarketingObjectives(marketingContext);

  return objectives.length > 0 ? getMarketingObjectiveLabel(objectives) : null;
}

export function getMarketingCampaignTypeOptionsForReportType(
  reportType: MarketingReportType | null | undefined
): Array<{ value: MarketingCampaignType; label: string; description: string }> {
  if (!reportType) {
    return MARKETING_CAMPAIGN_TYPE_OPTIONS;
  }

  const supportedCampaignTypes = MARKETING_CAMPAIGN_TYPES_BY_REPORT_TYPE[reportType] ?? [];
  return MARKETING_CAMPAIGN_TYPE_OPTIONS.filter((option) => supportedCampaignTypes.includes(option.value));
}

export function getMarketingObjectivesForCampaignType(
  campaignType: MarketingCampaignType
): Array<MarketingObjective> {
  return [
    ...(FACEBOOK_OBJECTIVES_BY_CAMPAIGN_TYPE[campaignType as keyof typeof FACEBOOK_OBJECTIVES_BY_CAMPAIGN_TYPE] ?? []),
    ...(GOOGLE_OBJECTIVES_BY_CAMPAIGN_TYPE[campaignType as keyof typeof GOOGLE_OBJECTIVES_BY_CAMPAIGN_TYPE] ?? []),
  ];
}

export function getMarketingObjectivesForReportType(
  reportType: MarketingReportType | null | undefined,
  campaignType: MarketingCampaignType | null | undefined
): Array<MarketingObjective> {
  if (!usesMarketingPresetMetrics(reportType) || !campaignType) {
    return [];
  }

  if (reportType === 'Facebook Ads') {
    return FACEBOOK_OBJECTIVES_BY_CAMPAIGN_TYPE[
      campaignType as keyof typeof FACEBOOK_OBJECTIVES_BY_CAMPAIGN_TYPE
    ] ?? [];
  }

  if (reportType === 'Google Ads') {
    return dedupeMarketingObjectives([
      ...(GOOGLE_OBJECTIVES_BY_CAMPAIGN_TYPE[
        campaignType as keyof typeof GOOGLE_OBJECTIVES_BY_CAMPAIGN_TYPE
      ] ?? []),
      ...GOOGLE_SHARED_OBJECTIVES,
    ]);
  }

  return [];
}

export function getMarketingObjectiveOptionsForReportType(
  reportType: MarketingReportType | null | undefined,
  campaignType?: MarketingCampaignType | null | undefined
): Array<MarketingObjective> {
  if (!reportType) {
    return Object.keys(MARKETING_OBJECTIVE_INFO) as Array<MarketingObjective>;
  }

  if (campaignType) {
    return getMarketingObjectivesForReportType(reportType, campaignType);
  }

  const campaignTypes = MARKETING_CAMPAIGN_TYPES_BY_REPORT_TYPE[reportType] ?? [];
  return Array.from(
    new Set(
      campaignTypes.flatMap((currentCampaignType) =>
        getMarketingObjectivesForReportType(reportType, currentCampaignType)
      )
    )
  );
}

export function createMarketingMetricPreset(
  reportType: MarketingReportType,
  campaignType?: MarketingCampaignType | null,
  objective?: MarketingObjective | ReadonlyArray<MarketingObjective> | null
): Array<MarketingMetricTemplate> {
  const resolvedObjective: MarketingObjective | null = Array.isArray(objective)
    ? objective[0] ?? null
    : objective ?? null;

  if (reportType === 'Email Marketing') {
    return EMAIL_MARKETING_METRIC_PRESET.map((metric) => ({ ...metric }));
  }

  if (reportType === 'Facebook Ads') {
    if (!resolvedObjective) {
      return [];
    }

    return (FACEBOOK_MARKETING_METRIC_PRESETS[resolvedObjective] ?? FACEBOOK_MARKETING_METRIC_PRESETS.brand_awareness ?? []).map((metric) => ({ ...metric }));
  }

  if (reportType === 'Google Ads') {
    if (!campaignType) {
      return [];
    }

    return GOOGLE_MARKETING_METRIC_PRESET.map((metric) => ({ ...metric }));
  }

  return [];
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
    return sanitizeMarketingContext(directMatch.data);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const normalizedReportType = inferMarketingReportType(
    candidate.marketingReportType,
    candidate.campaignName,
    candidate.primaryChannel
  );
  const rawCampaignType =
    typeof candidate.campaignType === 'string' ? candidate.campaignType.trim().toLowerCase() : '';
  const normalizeObjectiveValue = (value: unknown): MarketingObjective | null => {
    const rawObjective = typeof value === 'string' ? value.trim().toLowerCase() : '';

    if (!rawObjective) {
      return null;
    }

    const nextObjective = LEGACY_OBJECTIVE_MAP[rawObjective] ?? rawObjective;
    return Object.hasOwn(MARKETING_OBJECTIVE_INFO, nextObjective)
      ? (nextObjective as MarketingObjective)
      : null;
  };

  const normalizedObjectives = dedupeMarketingObjectives([
    ...(Array.isArray(candidate.objectives)
      ? candidate.objectives.map((value) => normalizeObjectiveValue(value))
      : []),
    normalizeObjectiveValue(candidate.objective),
  ]);
  const normalizedObjective = normalizedObjectives[0] ?? null;

  let normalizedCampaignType = rawCampaignType as MarketingCampaignType;

  if (!MARKETING_CAMPAIGN_TYPE_OPTIONS.some((option) => option.value === normalizedCampaignType)) {
    normalizedCampaignType = LEGACY_CAMPAIGN_TYPE_MAP[rawCampaignType] ?? normalizedCampaignType;
  }

  if (!MARKETING_CAMPAIGN_TYPE_OPTIONS.some((option) => option.value === normalizedCampaignType)) {
    if (normalizedObjective && AWARENESS_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'awareness';
    } else if (normalizedObjective && CONSIDERATION_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'consideration';
    } else if (normalizedObjective && CONVERSION_OBJECTIVES.has(normalizedObjective)) {
      normalizedCampaignType = 'conversion';
    }
  }

  const resolvedCampaignType = MARKETING_CAMPAIGN_TYPE_OPTIONS.some(
    (option) => option.value === normalizedCampaignType
  )
    ? normalizedCampaignType
    : null;

  const normalized = marketingContextSchema.safeParse({
    ...candidate,
    marketingReportType: normalizedReportType,
    campaignType:
      getMarketingCampaignTypeAvailability(normalizedReportType) === 'hidden'
        ? null
        : resolvedCampaignType,
    objective:
      getMarketingObjectiveAvailability(normalizedReportType) === 'hidden'
        ? null
        : normalizedObjective,
    objectives:
      getMarketingObjectiveAvailability(normalizedReportType) === 'hidden'
        ? null
        : normalizedReportType === 'Google Ads'
          ? normalizedObjectives
          : null,
    contentCreation:
      normalizedReportType === 'Content Creation'
        ? contentCreationDetailsSchema.safeParse(candidate.contentCreation).data ?? null
        : null,
  });

  return normalized.success ? sanitizeMarketingContext(normalized.data) : null;
}

export function buildNarrativeReportNotes({
  summary,
  results,
  accomplishments,
  challenges,
  nextWeekPlans,
}: {
  summary?: string;
  results?: string;
  accomplishments?: Array<string>;
  challenges?: Array<string>;
  nextWeekPlans?: Array<string>;
}): string | undefined {
  const parts: Array<string> = [];

  if (summary?.trim()) {
    parts.push(summary.trim());
  }

  if (results?.trim()) {
    parts.push(`Results:\n${results.trim()}`);
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
  const nextMarketingContext = sanitizeMarketingContext(marketingContext);

  if (!nextMarketingContext) {
    return cleanNotes || null;
  }

  const contextBlock = `${MARKETING_CONTEXT_START}\n${JSON.stringify(nextMarketingContext)}\n${MARKETING_CONTEXT_END}`;

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
  return (
    resolveMarketingReportType(marketingContext)?.trim() ||
    marketingContext?.campaignName?.trim() ||
    inferMarketingReportType(undefined, undefined, marketingContext?.primaryChannel) ||
    'Untitled Marketing Report'
  );
}

export function getMarketingReportContextSummary(
  marketingContext: MarketingContext | null | undefined
): string {
  if (!marketingContext) {
    return 'Campaign details unavailable';
  }

  const inferredReportType = inferMarketingReportType(
    marketingContext.marketingReportType,
    marketingContext.campaignName,
    marketingContext.primaryChannel
  );

  const objectiveLabel = getMarketingObjectiveSummaryLabel(marketingContext);

  if (!objectiveLabel) {
    return inferredReportType ?? getMarketingReportDisplayName(marketingContext);
  }

  if (marketingContext.primaryChannel?.trim()) {
    return `${objectiveLabel} via ${marketingContext.primaryChannel}`;
  }

  return objectiveLabel;
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
    reportType?: MarketingReportTypeFilterValue;
    campaignType?: MarketingCampaignFilterValue;
    objective?: MarketingObjectiveFilterValue;
    search?: string;
  }
): boolean {
  const { reportType = 'all', campaignType = 'all', objective = 'all', search = '' } = filters;
  const marketingContext = report.marketing_context;
  const marketingObjectives = getMarketingObjectives(marketingContext);
  const normalizedSearch = search.trim().toLowerCase();
  const inferredReportType = inferMarketingReportType(
    marketingContext?.marketingReportType,
    marketingContext?.campaignName,
    marketingContext?.primaryChannel
  );

  if (reportType !== 'all' && inferredReportType !== reportType) {
    return false;
  }

  if (campaignType !== 'all' && marketingContext?.campaignType !== campaignType) {
    return false;
  }

  if (objective !== 'all' && !marketingObjectives.includes(objective)) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  const haystack = [
    report.employees ? `${report.employees.first_name} ${report.employees.last_name}` : '',
    report.employees?.department || '',
    report.notes || '',
    getMarketingReportDisplayName(marketingContext),
    inferredReportType || '',
    marketingContext?.totalSpend?.toString() || '',
    marketingContext?.primaryChannel || '',
    marketingContext?.targetAudience || '',
    marketingContext?.campaignType
      ? getMarketingCampaignTypeLabel(marketingContext.campaignType)
      : '',
    getMarketingObjectiveSummaryLabel(marketingContext) || '',
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
  results: string;
  accomplishments: Array<string>;
  challenges: Array<string>;
  nextWeekPlans: Array<string>;
} {
  const result = {
    summary: '',
    results: '',
    accomplishments: [] as Array<string>,
    challenges: [] as Array<string>,
    nextWeekPlans: [] as Array<string>,
  };

  if (!notes) return result;

  const { cleanNotes } = extractMarketingContext(notes);

  if (!cleanNotes) return result;

  const sections = cleanNotes.split(/\n(?=(?:results|accomplishments|challenges|next\s*(?:steps|week\s*plans)):\s*)/i);

  for (const section of sections) {
    const trimmed = section.trim();
    if (/^results:/i.test(trimmed)) {
      result.results = trimmed.replace(/^results:\s*/i, '').trim();
    } else if (/^accomplishments:/i.test(trimmed)) {
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
