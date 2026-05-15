export type MarketingFieldAvailability = 'enabled' | 'disabled' | 'hidden';

export const MARKETING_REPORT_TYPE_BEHAVIOR = {
  'Facebook Ads': {
    campaignType: 'enabled',
    objective: 'enabled',
    presetMetrics: true,
  },
  'Google Ads': {
    campaignType: 'enabled',
    objective: 'enabled',
    presetMetrics: true,
  },
  'Email Marketing': {
    campaignType: 'hidden',
    objective: 'hidden',
    presetMetrics: true,
  },
  'Content Creation': {
    campaignType: 'hidden',
    objective: 'hidden',
    presetMetrics: false,
  },
} as const;

type MarketingReportTypeBehavior =
  (typeof MARKETING_REPORT_TYPE_BEHAVIOR)[keyof typeof MARKETING_REPORT_TYPE_BEHAVIOR];

function getMarketingReportTypeBehavior(
  reportType: string | null | undefined
): MarketingReportTypeBehavior | null {
  if (!reportType) {
    return null;
  }

  return MARKETING_REPORT_TYPE_BEHAVIOR[
    reportType as keyof typeof MARKETING_REPORT_TYPE_BEHAVIOR
  ] ?? null;
}

export function getMarketingCampaignTypeAvailability(
  reportType: string | null | undefined
): MarketingFieldAvailability {
  return getMarketingReportTypeBehavior(reportType)?.campaignType ?? 'hidden';
}

export function getMarketingObjectiveAvailability(
  reportType: string | null | undefined
): MarketingFieldAvailability {
  return getMarketingReportTypeBehavior(reportType)?.objective ?? 'hidden';
}

export function usesMarketingCampaignType(
  reportType: string | null | undefined
): boolean {
  return getMarketingCampaignTypeAvailability(reportType) !== 'hidden';
}

export function usesMarketingObjective(
  reportType: string | null | undefined
): boolean {
  return getMarketingObjectiveAvailability(reportType) !== 'hidden';
}

export function requiresMarketingCampaignType(
  reportType: string | null | undefined
): boolean {
  return getMarketingCampaignTypeAvailability(reportType) === 'enabled';
}

export function requiresMarketingObjective(
  reportType: string | null | undefined
): boolean {
  return getMarketingObjectiveAvailability(reportType) === 'enabled';
}

export function usesMarketingPresetMetrics(
  reportType: string | null | undefined
): boolean {
  return getMarketingReportTypeBehavior(reportType)?.presetMetrics ?? false;
}

export function supportsMarketingPlanningFilters(
  reportType: string | null | undefined
): boolean {
  return requiresMarketingCampaignType(reportType) || requiresMarketingObjective(reportType);
}