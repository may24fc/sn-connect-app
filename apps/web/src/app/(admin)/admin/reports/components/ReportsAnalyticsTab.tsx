'use client';

import { useReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/csv';
import { supportsMarketingPlanningFilters } from '@/lib/marketing-report-config';
import {
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
  type MarketingReportTypeFilterValue,
  formatUsdAmount,
  getMarketingCampaignTypeLabel,
  getMarketingMetricAnalyticsCategory,
  getMarketingObjectiveLabel,
  getMarketingReportDisplayName,
  getMarketingReportTypeLabel,
  matchesMarketingReportFilters,
  resolveMarketingReportType,
} from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  InsightsSummary,
  Label,
  MetricKPICard,
  MetricKPICardGrid,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  TooltipProvider,
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipTrigger as UITooltipTrigger,
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Download, HelpCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ReportsAnalyticsTabProps {
  department: string;
  reportType: MarketingReportTypeFilterValue;
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

type PlanningHorizon = 'current_window' | 'next_month' | 'next_quarter';

interface ForecastScenario {
  key: 'conservative' | 'expected' | 'aggressive';
  label: string;
  stance: string;
  summary: string;
  spend: number;
  projectedResults: number;
  projectedRevenue: number | null;
  projectedRoas: number | null;
  costPerResult: number | null;
  resultDeltaPercent: number;
  spendDeltaPercent: number;
  tone: 'zinc' | 'emerald' | 'amber';
}

interface ForecastLookbackSignal {
  key: string;
  label: string;
  description: string;
  rangeLabel: string;
  weight: number;
  reportCount: number;
  spend: number;
  outcomes: number;
  averageRoas: number | null;
}

interface ForecastSummary {
  totalReports: number;
  totalSpend: number;
  totalOutcomes: number;
  weightedSpend: number;
  weightedOutcomes: number;
  uniqueCampaigns: number;
  averageRoas: number | null;
  weightedAverageRoas: number | null;
  roasCoverage: number;
  topOutcomeMetric: string | null;
  observedSignals: Array<ForecastLookbackSignal>;
  lookbackWindowLabel: string;
  confidenceScore: number;
  confidenceLabel: 'High' | 'Moderate' | 'Low';
  confidenceNote: string;
}

interface AnalyticsReportLike {
  status: string;
  deleted_at: string | null;
  period_start: string;
  marketing_context: {
    marketingReportType?: string | null | undefined;
    campaignName?: string | null | undefined;
    campaignType?: string | null | undefined;
    objective?: string | null | undefined;
    primaryChannel?: string | null | undefined;
    totalSpend?: number | null | undefined;
  } | null;
  report_metrics?: Array<{
    metric_name: string;
    metric_value: number;
  }> | null;
}

interface ForecastDiagnostics {
  totalMatchedReports: number;
  activeReports: number;
  archivedReports: number;
  reportsWithPlanningFields: number;
  reportsWithSpend: number;
  reportsWithOutcomeSignals: number;
  reportsWithRoas: number;
  blockers: Array<string>;
}

type ForecastScopeMode = 'macro' | 'tactical';

const HORIZON_CONFIG: Record<
  PlanningHorizon,
  { label: string; multiplier: number; description: string }
> = {
  current_window: {
    label: 'Current window',
    multiplier: 1,
    description: 'Keep the plan anchored to the weighted 28-day baseline.',
  },
  next_month: {
    label: 'Next month',
    multiplier: 1.12,
    description: 'Stretch the weighted 28-day signal into the next monthly budget cycle.',
  },
  next_quarter: {
    label: 'Next quarter',
    multiplier: 1.35,
    description:
      'Use the weighted 28-day signal as the base case for a broader quarterly scenario.',
  },
};

const FORECAST_LOOKBACK_DAYS = 28;
const FORECAST_INCLUDED_STATUSES = ['submitted', 'approved'] as const;

const FORECAST_WEEK_BUCKETS = [
  {
    key: 'week_1',
    label: 'Week 1 Ago',
    description: 'Most recent 7 days',
    weight: 0.4,
    startOffsetDays: 6,
    endOffsetDays: 0,
  },
  {
    key: 'week_2',
    label: 'Week 2 Ago',
    description: 'Days 8 to 14',
    weight: 0.3,
    startOffsetDays: 13,
    endOffsetDays: 7,
  },
  {
    key: 'week_3',
    label: 'Week 3 Ago',
    description: 'Days 15 to 21',
    weight: 0.2,
    startOffsetDays: 20,
    endOffsetDays: 14,
  },
  {
    key: 'week_4',
    label: 'Week 4 Ago',
    description: 'Days 22 to 28',
    weight: 0.1,
    startOffsetDays: 27,
    endOffsetDays: 21,
  },
] as const;

function ForecastRequirementsCard({
  showRevenue,
  reportType,
}: {
  showRevenue: boolean;
  reportType: MarketingReportTypeFilterValue;
}) {
  const planningFieldsRelevant =
    reportType === 'all' || supportsMarketingPlanningFilters(reportType);
  const selectedReportTypeLabel =
    reportType === 'all' ? 'All report types' : getMarketingReportTypeLabel(reportType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>What Employees Must Fill In</CardTitle>
        <CardDescription>
          Forecasting activates only when submitted or approved marketing reports include the
          required report context and at least one measurable result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
          <p className="font-medium text-foreground">Required campaign setup fields</p>
          <ul className="space-y-2 text-muted-foreground">
            {planningFieldsRelevant ? (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  Campaign Type and Objective are required for Facebook Ads and Google Ads reports
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  Email Marketing and Content Creation rely on Report Type, spend, and measurable
                  outcome metrics instead
                </li>
              </>
            ) : (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                {selectedReportTypeLabel} does not use Campaign Type or Objective in this release
              </li>
            )}
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Total Spend greater than AU$0
            </li>
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
          <p className="font-medium text-foreground">Required performance signal</p>
          <p className="text-muted-foreground">
            Add at least one primary metric with a value greater than 0, such as leads, purchases,
            booked calls, applications, or messages.
          </p>
        </div>

        {showRevenue && (
          <div className="space-y-2 rounded-lg border border-amber-200/70 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-medium">Needed for sales value forecasting</p>
            <p>
              If you want projected revenue or sales value, employees also need to include a ROAS
              metric in the submitted report.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Rejected and draft reports do not count. The forecast reads a weighted 28-day lookback and
          only uses submitted or approved marketing reports that fall inside that active window.
        </p>
      </CardContent>
    </Card>
  );
}

function isIncludedForecastStatus(status: string): boolean {
  return FORECAST_INCLUDED_STATUSES.includes(status as (typeof FORECAST_INCLUDED_STATUSES)[number]);
}

function getForecastScopeMode(
  reportType: MarketingReportTypeFilterValue,
  campaignType: MarketingCampaignFilterValue,
  objective: MarketingObjectiveFilterValue
): ForecastScopeMode {
  return reportType === 'all' && campaignType === 'all' && objective === 'all'
    ? 'macro'
    : 'tactical';
}

const SCENARIO_BLUEPRINTS = [
  {
    key: 'conservative',
    label: 'Conservative',
    stance: 'Protect efficiency',
    summary: 'Lower spend with a modest efficiency haircut.',
    spendMultiplier: 0.88,
    efficiencyDelta: -0.08,
    revenueDelta: -0.06,
    tone: 'zinc',
  },
  {
    key: 'expected',
    label: 'Expected',
    stance: 'Use current signal',
    summary: 'Keep delivery close to the latest Meta and Google Ads baseline.',
    spendMultiplier: 1,
    efficiencyDelta: 0,
    revenueDelta: 0,
    tone: 'emerald',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    stance: 'Push for growth',
    summary: 'Increase budget and assume the best recent performance still holds.',
    spendMultiplier: 1.18,
    efficiencyDelta: 0.06,
    revenueDelta: 0.08,
    tone: 'amber',
  },
] as const;

function normalizeMetricName(metricName: string | null | undefined): string {
  return metricName?.trim().toLowerCase() ?? '';
}

function formatCurrency(value: number): string {
  return `AU$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `AU$${(value / 1000).toFixed(0)}k`;
  }

  return formatCurrency(value);
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return Math.round(value).toLocaleString('en-US');
}

function formatResultValue(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 100 ? 0 : 1,
  });
}

function getForecastResultLabel(
  scopeMode: ForecastScopeMode,
  objective: MarketingObjectiveFilterValue,
  topOutcomeMetric: string | null
): string {
  if (scopeMode === 'macro') {
    return 'Projected macro conversions';
  }

  if (objective === 'all') {
    return topOutcomeMetric ? `Projected ${topOutcomeMetric}` : 'Projected results';
  }

  switch (objective) {
    case 'brand_awareness':
    case 'reach':
      return 'Projected reach';
    case 'traffic':
      return 'Projected visits';
    case 'engagement':
      return 'Projected engagement';
    case 'app_installs':
      return 'Projected installs';
    case 'video_views':
      return 'Projected views';
    case 'lead_generation':
      return 'Projected leads';
    case 'messages':
      return 'Projected conversations';
    case 'conversions':
      return 'Projected conversions';
    case 'catalog_sales':
      return 'Projected purchases';
    case 'store_traffic':
      return 'Projected store visits';
    default:
      return topOutcomeMetric ? `Projected ${topOutcomeMetric}` : 'Projected results';
  }
}

function getTacticalEfficiencyMetricLabel(
  objective: MarketingObjectiveFilterValue,
  resultLabel: string
): string {
  switch (objective) {
    case 'lead_generation':
      return 'Weighted CPL';
    case 'messages':
      return 'Weighted Cost Per Conversation';
    case 'app_installs':
      return 'Weighted CPI';
    case 'conversions':
    case 'catalog_sales':
    case 'store_traffic':
      return 'Weighted CPA';
    default:
      return `Weighted ${resultLabel.replace(/^Projected\s+/i, 'Cost Per ')}`;
  }
}

function getRoasUnavailableMessage(
  scopeMode: ForecastScopeMode,
  objective: MarketingObjectiveFilterValue,
  hasRoasSignal: boolean
): string {
  if (scopeMode === 'macro' || objective === 'all' || !isRevenueForwardObjective(objective)) {
    return 'ROAS is only calculated when filtering by a revenue-generating objective (e.g., Conversion/Sales).';
  }

  if (!hasRoasSignal) {
    return 'The selected tactical reports do not yet include enough ROAS entries to calculate a revenue signal.';
  }

  return 'ROAS is available for this tactical forecast.';
}

function isRevenueForwardObjective(objective: MarketingObjectiveFilterValue): boolean {
  return (
    objective === 'conversions' || objective === 'catalog_sales' || objective === 'store_traffic'
  );
}

function getConfidenceSummary(
  reportCount: number,
  totalSpend: number,
  totalOutcomes: number,
  roasCount: number
): Pick<ForecastSummary, 'confidenceScore' | 'confidenceLabel' | 'confidenceNote'> {
  const reportScore = Math.min(reportCount / 8, 1) * 40;
  const spendScore = totalSpend > 0 ? 20 : 0;
  const outcomeScore = totalOutcomes > 0 ? 20 : 0;
  const roasScore = reportCount > 0 ? Math.min(roasCount / reportCount, 1) * 20 : 0;
  const confidenceScore = Math.round(reportScore + spendScore + outcomeScore + roasScore);

  if (confidenceScore >= 75) {
    return {
      confidenceScore,
      confidenceLabel: 'High',
      confidenceNote:
        'Strong recent spend, result, and ROAS coverage make this forecast usable for budget decisions.',
    };
  }

  if (confidenceScore >= 50) {
    return {
      confidenceScore,
      confidenceLabel: 'Moderate',
      confidenceNote:
        'Use the expected scenario as a guide, but pressure-test the channel mix before locking budget.',
    };
  }

  return {
    confidenceScore,
    confidenceLabel: 'Low',
    confidenceNote:
      'The forecast is directional only. Add more submitted reports or more complete ROAS tracking before making hard commitments.',
  };
}

function formatPeriodLabel(
  timeRange: 'weekly' | 'monthly' | 'custom',
  periodStart: string,
  periodEnd: string
): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);

  if (timeRange === 'monthly') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function buildUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function shiftUtcDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

type ForecastBucketAccumulator = ForecastLookbackSignal & {
  periodStart: string;
  periodEnd: string;
  roasTotal: number;
  roasCount: number;
};

function buildForecastBuckets(periodEnd: string): Array<ForecastBucketAccumulator> {
  const anchorDate = buildUtcDate(periodEnd);

  return FORECAST_WEEK_BUCKETS.map((bucket) => {
    const bucketStart = shiftUtcDate(anchorDate, -bucket.startOffsetDays);
    const bucketEnd = shiftUtcDate(anchorDate, -bucket.endOffsetDays);

    return {
      key: bucket.key,
      label: bucket.label,
      description: bucket.description,
      rangeLabel: formatPeriodLabel(
        'custom',
        extractDateString(bucketStart.toISOString()),
        extractDateString(bucketEnd.toISOString())
      ),
      weight: bucket.weight,
      periodStart: extractDateString(bucketStart.toISOString()),
      periodEnd: extractDateString(bucketEnd.toISOString()),
      reportCount: 0,
      spend: 0,
      outcomes: 0,
      averageRoas: null,
      roasTotal: 0,
      roasCount: 0,
    };
  });
}

function resolveForecastBucket(
  buckets: Array<ForecastBucketAccumulator>,
  report: Pick<AnalyticsReportLike, 'period_start'> & { period_end?: string }
): ForecastBucketAccumulator | undefined {
  const bucketDate = extractDateString(report.period_end ?? report.period_start);

  return buckets.find(
    (bucket) => bucketDate >= bucket.periodStart && bucketDate <= bucket.periodEnd
  );
}

function buildForecastSummary(
  reports: ReturnType<typeof useReports>['data'] extends infer _ ? Array<any> : never,
  periodStart: string,
  periodEnd: string
): ForecastSummary {
  const uniqueCampaigns = new Set<string>();
  const objectiveOutcomeMap = new Map<string, { total: number; count: number }>();
  const forecastBuckets = buildForecastBuckets(periodEnd);

  let totalSpend = 0;
  let totalOutcomes = 0;
  let roasTotal = 0;
  let roasCount = 0;

  for (const report of reports as Array<any>) {
    const marketingContext = report.marketing_context;
    const reportSpend = marketingContext?.totalSpend ?? 0;
    const metrics = report.report_metrics || [];
    const outcomeMetrics = metrics.filter(
      (metric: { metric_name: string; metric_value: number }) =>
        getMarketingMetricAnalyticsCategory(metric.metric_name) === 'outcome'
    );
    const reportOutcomes = outcomeMetrics.reduce(
      (sum: number, metric: { metric_value: number }) => sum + (metric.metric_value || 0),
      0
    );
    const roasMetric = metrics.find(
      (metric: { metric_name: string; metric_value: number }) =>
        normalizeMetricName(metric.metric_name) === 'roas' && metric.metric_value > 0
    );
    const forecastBucket = resolveForecastBucket(forecastBuckets, report);

    totalSpend += reportSpend;
    totalOutcomes += reportOutcomes;

    if (forecastBucket) {
      forecastBucket.reportCount += 1;
      forecastBucket.spend += reportSpend;
      forecastBucket.outcomes += reportOutcomes;
    }

    if (roasMetric) {
      roasTotal += roasMetric.metric_value;
      roasCount += 1;

      if (forecastBucket) {
        forecastBucket.roasTotal += roasMetric.metric_value;
        forecastBucket.roasCount += 1;
      }
    }

    const reportLabel = getMarketingReportDisplayName(marketingContext);

    if (reportLabel !== 'Untitled Marketing Report') {
      uniqueCampaigns.add(reportLabel);
    }

    for (const metric of outcomeMetrics) {
      const contributionWeight = forecastBucket?.weight ?? 0;
      const entry = objectiveOutcomeMap.get(metric.metric_name) || { total: 0, count: 0 };
      entry.total += (metric.metric_value || 0) * contributionWeight;
      entry.count += contributionWeight;
      objectiveOutcomeMap.set(metric.metric_name, entry);
    }
  }

  const observedSignals = forecastBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    description: bucket.description,
    rangeLabel: bucket.rangeLabel,
    weight: bucket.weight,
    reportCount: bucket.reportCount,
    spend: bucket.spend,
    outcomes: bucket.outcomes,
    averageRoas: bucket.roasCount > 0 ? bucket.roasTotal / bucket.roasCount : null,
  }));

  const weightedSpend = observedSignals.reduce(
    (sum, signal) => sum + signal.spend * signal.weight,
    0
  );
  const weightedOutcomes = observedSignals.reduce(
    (sum, signal) => sum + signal.outcomes * signal.weight,
    0
  );
  const weightedRoasWeight = observedSignals.reduce(
    (sum, signal) => sum + (signal.averageRoas !== null ? signal.weight : 0),
    0
  );
  const weightedAverageRoas =
    weightedRoasWeight > 0
      ? observedSignals.reduce(
          (sum, signal) =>
            sum + (signal.averageRoas !== null ? signal.averageRoas * signal.weight : 0),
          0
        ) / weightedRoasWeight
      : null;

  const topOutcomeMetric =
    Array.from(objectiveOutcomeMap.entries()).sort((left, right) => {
      if (right[1].count === left[1].count) {
        return right[1].total - left[1].total;
      }
      return right[1].count - left[1].count;
    })[0]?.[0] ?? null;

  const confidence = getConfidenceSummary(
    reports.length,
    weightedSpend,
    weightedOutcomes,
    roasCount
  );

  return {
    totalReports: reports.length,
    totalSpend,
    totalOutcomes,
    weightedSpend,
    weightedOutcomes,
    uniqueCampaigns: uniqueCampaigns.size,
    averageRoas: roasCount > 0 ? roasTotal / roasCount : null,
    weightedAverageRoas,
    roasCoverage: roasCount,
    topOutcomeMetric,
    observedSignals,
    lookbackWindowLabel: `28-day weighted lookback (${formatPeriodLabel('custom', periodStart, periodEnd)})`,
    ...confidence,
  };
}

function getOutcomeTotal(report: AnalyticsReportLike): number {
  return (report.report_metrics || [])
    .filter((metric) => getMarketingMetricAnalyticsCategory(metric.metric_name) === 'outcome')
    .reduce((sum, metric) => sum + (metric.metric_value || 0), 0);
}

function getRoasValue(report: AnalyticsReportLike): number | null {
  const roasMetric = (report.report_metrics || []).find(
    (metric) => normalizeMetricName(metric.metric_name) === 'roas' && metric.metric_value > 0
  );

  return roasMetric?.metric_value ?? null;
}

function hasPlanningFields(report: AnalyticsReportLike): boolean {
  const marketingContext = report.marketing_context;
  const resolvedReportType = resolveMarketingReportType(marketingContext);

  if (!supportsMarketingPlanningFilters(resolvedReportType)) {
    return true;
  }

  return Boolean(marketingContext?.campaignType?.trim() && marketingContext?.objective?.trim());
}

function buildForecastDiagnostics(
  matchedReports: Array<AnalyticsReportLike>,
  activeReports: Array<AnalyticsReportLike>
): ForecastDiagnostics {
  const archivedReports = matchedReports.length - activeReports.length;
  const reportsWithPlanningFields = activeReports.filter(hasPlanningFields).length;
  const reportsWithSpend = activeReports.filter(
    (report) => (report.marketing_context?.totalSpend ?? 0) > 0
  ).length;
  const reportsWithOutcomeSignals = activeReports.filter(
    (report) => getOutcomeTotal(report) > 0
  ).length;
  const reportsWithRoas = activeReports.filter((report) => getRoasValue(report) !== null).length;
  const blockers: Array<string> = [];

  if (activeReports.length === 0) {
    blockers.push(
      archivedReports > 0
        ? `${archivedReports} matching submitted report${archivedReports === 1 ? ' is' : 's are'} archived and excluded from forecasting.`
        : 'No submitted or approved marketing reports match the active 28-day lookback and filters.'
    );
  }

  if (activeReports.length > reportsWithPlanningFields) {
    const missingPlanningCount = activeReports.length - reportsWithPlanningFields;
    blockers.push(
      `${missingPlanningCount} active report${missingPlanningCount === 1 ? ' is' : 's are'} missing the required campaign type or objective.`
    );
  }

  if (activeReports.length > 0 && reportsWithSpend === 0) {
    blockers.push('0 active reports have tracked or recoverable spend.');
  }

  if (activeReports.length > 0 && reportsWithOutcomeSignals === 0) {
    blockers.push('0 active reports have outcome metrics above 0.');
  }

  return {
    totalMatchedReports: matchedReports.length,
    activeReports: activeReports.length,
    archivedReports,
    reportsWithPlanningFields,
    reportsWithSpend,
    reportsWithOutcomeSignals,
    reportsWithRoas,
    blockers,
  };
}

function ForecastDiagnosticsCard({ diagnostics }: { diagnostics: ForecastDiagnostics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast Diagnostics</CardTitle>
        <CardDescription>
          This shows exactly which submitted or approved marketing reports are usable for the
          selected forecast window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Matched reports
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {diagnostics.totalMatchedReports}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Active reports
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {diagnostics.activeReports}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Reports with spend
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {diagnostics.reportsWithSpend}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Reports with outcomes
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {diagnostics.reportsWithOutcomeSignals}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Required context ready:{' '}
            <span className="font-medium text-foreground">
              {diagnostics.reportsWithPlanningFields}
            </span>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Archived in window:{' '}
            <span className="font-medium text-foreground">{diagnostics.archivedReports}</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Reports with ROAS:{' '}
            <span className="font-medium text-foreground">{diagnostics.reportsWithRoas}</span>
          </div>
        </div>

        {diagnostics.blockers.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-medium">Current blockers</p>
            <ul className="space-y-2">
              {diagnostics.blockers.map((blocker) => (
                <li key={blocker} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScenarioCard({
  scenario,
  resultLabel,
  efficiencyLabel,
  showRevenue,
  showTacticalMetrics,
}: {
  scenario: ForecastScenario;
  resultLabel: string;
  efficiencyLabel: string;
  showRevenue: boolean;
  showTacticalMetrics: boolean;
}) {
  const toneClasses = {
    zinc: 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40',
    emerald:
      'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    amber: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30',
  } as const;

  return (
    <Card className={toneClasses[scenario.tone]}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{scenario.label}</CardTitle>
            <CardDescription>{scenario.summary}</CardDescription>
          </div>
          <Badge>{scenario.stance}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {showRevenue ? 'Projected sales value' : resultLabel}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {showRevenue && scenario.projectedRevenue !== null
              ? formatCompactCurrency(scenario.projectedRevenue)
              : formatCompactNumber(scenario.projectedResults)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Planned spend</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatUsdAmount(scenario.spend)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{resultLabel}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatResultValue(scenario.projectedResults)}
            </p>
          </div>
          {showTacticalMetrics ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">{efficiencyLabel}</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {scenario.costPerResult !== null
                    ? formatUsdAmount(scenario.costPerResult)
                    : 'Not enough result data'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected ROAS</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {scenario.projectedRoas !== null
                    ? `${scenario.projectedRoas.toFixed(2)}x`
                    : 'ROAS not available'}
                </p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-lg border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
              Blended macro mode suppresses tactical efficiency metrics until you drill into a
              specific report type, campaign type, or objective.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Safely extract date string (YYYY-MM-DD) from an ISO string or return as-is
 */
function extractDateString(dateStr: string): string {
  if (dateStr.includes('T')) {
    return dateStr.substring(0, 10);
  }
  return dateStr;
}

/**
 * Calculate period dates based on the time range
 */
function getForecastLookbackDates(
  timeRange: 'weekly' | 'monthly' | 'custom',
  _customStartDate?: string,
  customEndDate?: string
): { start: string; end: string } {
  const referenceDate =
    timeRange === 'custom' && customEndDate
      ? buildUtcDate(customEndDate)
      : buildUtcDate(extractDateString(new Date().toISOString()));
  const start = shiftUtcDate(referenceDate, -(FORECAST_LOOKBACK_DAYS - 1));

  return {
    start: extractDateString(start.toISOString()),
    end: extractDateString(referenceDate.toISOString()),
  };
}

export function ReportsAnalyticsTab({
  department,
  reportType,
  campaignType,
  objective,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsAnalyticsTabProps) {
  const { start: periodStart, end: periodEnd } = getForecastLookbackDates(
    timeRange,
    customStartDate,
    customEndDate
  );
  const forecastWindowSummary = `28-day weighted lookback: ${formatPeriodLabel('custom', periodStart, periodEnd)}`;

  const filters = {
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    periodStart,
    periodEnd,
    archived: 'include' as const,
    pageSize: 500, // Get more reports for analytics
  };

  const { data, isLoading, error } = useReports(filters);
  const matchedReports = useMemo<Array<AnalyticsReportLike>>(
    () =>
      (data?.data || []).filter(
        (report) =>
          isIncludedForecastStatus(report.status) &&
          matchesMarketingReportFilters(report, { reportType, campaignType, objective })
      ),
    [campaignType, data?.data, objective, reportType]
  );
  const reports = useMemo(
    () => matchedReports.filter((report) => !report.deleted_at),
    [matchedReports]
  );

  const forecastSummary = useMemo(
    () => buildForecastSummary(reports, periodStart, periodEnd),
    [periodEnd, periodStart, reports]
  );
  const forecastDiagnostics = useMemo(
    () => buildForecastDiagnostics(matchedReports, reports),
    [matchedReports, reports]
  );
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>('current_window');
  const [budgetInput, setBudgetInput] = useState('0');
  const planningFiltersRelevant =
    reportType === 'all' || supportsMarketingPlanningFilters(reportType);
  const reportTypeSummaryLabel =
    reportType === 'all' ? 'All report types' : getMarketingReportTypeLabel(reportType);
  const forecastScopeMode = getForecastScopeMode(reportType, campaignType, objective);
  const isMacroScope = forecastScopeMode === 'macro';

  const baselineSignal = useMemo(() => {
    return {
      spend: forecastSummary.weightedSpend,
      outcomes: forecastSummary.weightedOutcomes,
      roas: forecastSummary.weightedAverageRoas,
      usingFallback: false,
    };
  }, [
    forecastSummary.weightedAverageRoas,
    forecastSummary.weightedOutcomes,
    forecastSummary.weightedSpend,
  ]);

  const recommendedBudget = useMemo(
    () => baselineSignal.spend * HORIZON_CONFIG[planningHorizon].multiplier,
    [baselineSignal.spend, planningHorizon]
  );

  useEffect(() => {
    setBudgetInput(recommendedBudget > 0 ? recommendedBudget.toFixed(0) : '0');
  }, [recommendedBudget]);

  const planBudget = useMemo(() => {
    const parsedBudget = Number(budgetInput);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return recommendedBudget;
    }

    return parsedBudget;
  }, [budgetInput, recommendedBudget]);

  const outcomePerDollar =
    baselineSignal.spend > 0 ? baselineSignal.outcomes / baselineSignal.spend : 0;
  const resultLabel = getForecastResultLabel(
    forecastScopeMode,
    objective,
    forecastSummary.topOutcomeMetric
  );
  const hasRoasSignal = Boolean(baselineSignal.roas && baselineSignal.roas > 0);
  const showRevenue =
    forecastScopeMode === 'tactical' &&
    objective !== 'all' &&
    isRevenueForwardObjective(objective) &&
    hasRoasSignal;
  const tacticalEfficiencyLabel = getTacticalEfficiencyMetricLabel(objective, resultLabel);
  const roasUnavailableMessage = getRoasUnavailableMessage(
    forecastScopeMode,
    objective,
    hasRoasSignal
  );
  const scopeBadgeLabel = isMacroScope ? 'Blended Macro View' : 'Targeted Tactical View';
  const scenarioCards = useMemo(() => {
    const confidenceModifier =
      forecastSummary.confidenceScore >= 75
        ? 1
        : forecastSummary.confidenceScore >= 50
          ? 0.75
          : 0.45;

    return SCENARIO_BLUEPRINTS.map((scenario) => {
      const spend = planBudget * scenario.spendMultiplier;
      const projectedResults =
        outcomePerDollar > 0
          ? spend * outcomePerDollar * (1 + scenario.efficiencyDelta * confidenceModifier)
          : 0;
      const projectedRevenue = baselineSignal.roas
        ? spend * baselineSignal.roas * (1 + scenario.revenueDelta * confidenceModifier)
        : null;

      return {
        key: scenario.key,
        label: scenario.label,
        stance: scenario.stance,
        summary: scenario.summary,
        spend,
        projectedResults,
        projectedRevenue,
        projectedRoas: projectedRevenue !== null && spend > 0 ? projectedRevenue / spend : null,
        costPerResult: projectedResults > 0 ? spend / projectedResults : null,
        resultDeltaPercent:
          baselineSignal.outcomes > 0
            ? ((projectedResults - baselineSignal.outcomes) / baselineSignal.outcomes) * 100
            : 0,
        spendDeltaPercent:
          baselineSignal.spend > 0
            ? ((spend - baselineSignal.spend) / baselineSignal.spend) * 100
            : 0,
        tone: scenario.tone,
      } satisfies ForecastScenario;
    });
  }, [
    baselineSignal.outcomes,
    baselineSignal.roas,
    baselineSignal.spend,
    forecastSummary.confidenceScore,
    outcomePerDollar,
    planBudget,
  ]);

  const forecastChartData = useMemo(
    () =>
      scenarioCards.map((scenario) => ({
        scenario: scenario.label,
        spend: Number(scenario.spend.toFixed(2)),
        projectedResults: Number(scenario.projectedResults.toFixed(2)),
        projectedRevenue: Number((scenario.projectedRevenue ?? 0).toFixed(2)),
      })),
    [scenarioCards]
  );

  const insightsData = useMemo(() => {
    const keyFindings = [
      {
        metric: 'Observed campaign set',
        insight: `${forecastSummary.totalReports} eligible reports across ${forecastSummary.uniqueCampaigns} campaign${forecastSummary.uniqueCampaigns === 1 ? '' : 's'} in ${forecastSummary.lookbackWindowLabel}.`,
      },
      {
        metric: 'Weighted baseline signal',
        insight: `${formatUsdAmount(forecastSummary.weightedSpend)} weighted spend signal derived from ${formatUsdAmount(forecastSummary.totalSpend)} raw spend and ${formatResultValue(forecastSummary.weightedOutcomes)} weighted results.`,
        highlight: forecastSummary.weightedSpend > 0 && forecastSummary.weightedOutcomes > 0,
      },
      {
        metric: 'Result metric',
        insight: isMacroScope
          ? 'Macro mode blends spend and primary conversion outcomes only, and leaves tactical efficiency metrics locked until you narrow the scope.'
          : forecastSummary.topOutcomeMetric
            ? `${forecastSummary.topOutcomeMetric} is the strongest repeated outcome signal in this forecast window.`
            : 'No single outcome metric dominates the current signal set.',
      },
      {
        metric: 'Confidence',
        insight: `${forecastSummary.confidenceLabel} confidence (${forecastSummary.confidenceScore}/100). ${forecastSummary.confidenceNote}`,
        highlight: forecastSummary.confidenceLabel !== 'Low',
      },
    ];

    const recommendations = [
      'Use the expected scenario as the planning baseline and treat conservative and aggressive as budget guardrails.',
      'The planner applies a 40% / 30% / 20% / 10% weight to the last four historical weeks before generating scenarios.',
      showRevenue
        ? `Projected sales value is using the observed ROAS signal from ${forecastSummary.roasCoverage} report${forecastSummary.roasCoverage === 1 ? '' : 's'}.`
        : isMacroScope
          ? 'Macro mode intentionally hides ROAS until you filter to a revenue-generating objective.'
          : 'Revenue is hidden because the selected tactical reports do not carry enough ROAS data. Use projected results and the tactical cost metric instead.',
      forecastSummary.confidenceLabel === 'Low'
        ? 'Broaden the date range or tighten the filters to a cleaner objective cluster before using this for committed spend changes.'
        : 'Keep the same employee-side report structure intact so future forecasts continue to compare campaign type, objective, and spend cleanly.',
    ];

    return {
      summary: `This planner uses a weighted 28-day moving average across the last four historical weeks and translates that signal into ${isMacroScope ? 'blended macro' : 'targeted tactical'} forecast scenarios for ${resultLabel.toLowerCase()}.`,
      keyFindings,
      recommendations,
    };
  }, [
    forecastSummary.confidenceLabel,
    forecastSummary.confidenceNote,
    forecastSummary.confidenceScore,
    forecastSummary.lookbackWindowLabel,
    forecastSummary.roasCoverage,
    forecastSummary.topOutcomeMetric,
    forecastSummary.totalReports,
    forecastSummary.totalSpend,
    forecastSummary.uniqueCampaigns,
    forecastSummary.weightedOutcomes,
    forecastSummary.weightedSpend,
    isMacroScope,
    resultLabel,
    showRevenue,
  ]);

  const handleExport = () => {
    if (scenarioCards.length === 0) return;

    exportToCsv(scenarioCards, {
      filename: 'marketing-sales-forecast-28-day-weighted',
      headers: [
        'Scenario',
        'Planning Horizon',
        'Projected Result Label',
        'Planned Spend (AUD)',
        'Projected Results',
        'Projected Revenue (AUD)',
        'Projected ROAS',
        'Projected Cost Per Result (AUD)',
      ],
      rowMapper: (scenario) => [
        scenario.label,
        HORIZON_CONFIG[planningHorizon].label,
        resultLabel,
        scenario.spend.toFixed(2),
        scenario.projectedResults.toFixed(2),
        scenario.projectedRevenue?.toFixed(2) ?? '',
        scenario.projectedRoas?.toFixed(2) ?? '',
        scenario.costPerResult?.toFixed(2) ?? '',
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load forecast data"
            description="The sales forecast workspace could not be built from the selected marketing reports. Refresh and try again."
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  if (!reports.length) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Forecasting is waiting for live marketing reports"
              description={
                forecastDiagnostics.blockers[0] ??
                'To activate this forecast, employees need submitted or approved marketing reports inside the active 28-day lookback with report type, tracked spend, and at least one real result metric.'
              }
              size="sm"
            />
          </CardContent>
        </Card>
        <ForecastDiagnosticsCard diagnostics={forecastDiagnostics} />
        <ForecastRequirementsCard showRevenue={showRevenue} reportType={reportType} />
      </div>
    );
  }

  if (forecastSummary.totalSpend <= 0 || (forecastSummary.totalOutcomes <= 0 && !showRevenue)) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Forecasting needs spend and result data"
              description={
                forecastDiagnostics.blockers[0] ??
                'Reports exist for this filter, but the active 28-day lookback still does not include enough tracked spend or outcome values to build a forecast.'
              }
              size="sm"
            />
          </CardContent>
        </Card>
        <ForecastDiagnosticsCard diagnostics={forecastDiagnostics} />
        <ForecastRequirementsCard showRevenue={showRevenue} reportType={reportType} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing weighted sales forecast scenarios for the{' '}
          <span className="font-medium text-foreground">Marketing team</span> |{' '}
          {reportTypeSummaryLabel}{' '}
          {planningFiltersRelevant && campaignType !== 'all'
            ? `| ${getMarketingCampaignTypeLabel(campaignType)} `
            : ''}
          {planningFiltersRelevant && objective !== 'all'
            ? `| ${getMarketingObjectiveLabel(objective)} `
            : ''}
          | {forecastWindowSummary}
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!scenarioCards.length}>
          <Download className="h-4 w-4 mr-2" />
          Export forecast
        </Button>
      </div>

      <MetricKPICardGrid>
        <MetricKPICard
          label="Weighted Spend Signal"
          value={formatCompactCurrency(forecastSummary.weightedSpend)}
          change={{
            absolute: `${formatUsdAmount(forecastSummary.totalSpend)} raw spend across ${forecastSummary.totalReports} reports`,
            trend: 'stable',
          }}
          color="blue"
        />
        <MetricKPICard
          label={resultLabel}
          value={formatResultValue(forecastSummary.weightedOutcomes)}
          change={{
            absolute: `${forecastSummary.uniqueCampaigns} active campaigns in the 28-day lookback`,
            trend: 'stable',
          }}
          color="green"
        />
        <MetricKPICard
          label={
            isMacroScope
              ? 'Revenue Signal'
              : showRevenue
                ? 'Weighted ROAS'
                : tacticalEfficiencyLabel
          }
          value={
            isMacroScope
              ? 'Not available'
              : showRevenue && forecastSummary.weightedAverageRoas !== null
                ? `${forecastSummary.weightedAverageRoas.toFixed(2)}x`
                : formatCurrency(
                    forecastSummary.weightedSpend / Math.max(forecastSummary.weightedOutcomes, 1)
                  )
          }
          change={{
            absolute: isMacroScope
              ? 'Filter to a revenue objective to unlock ROAS'
              : showRevenue
                ? `${forecastSummary.roasCoverage}/${forecastSummary.totalReports} reports include ROAS`
                : 'Computed from the weighted spend and tactical result signal',
            trend: 'stable',
          }}
          color="orange"
        />
        <MetricKPICard
          label="Forecast Confidence"
          value={forecastSummary.confidenceLabel}
          change={{
            absolute: `${forecastSummary.confidenceScore}/100 signal score`,
            trend: 'stable',
          }}
          color="blue"
        />
      </MetricKPICardGrid>

      <Card>
        <CardHeader>
          <CardTitle>28-Day Forecast Setup</CardTitle>
          <CardDescription>
            This planner mirrors the employee marketing report structure for the selected report
            type and builds a weighted 28-day moving average before generating conservative,
            expected, and aggressive scenarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Report Type
              </Label>
              <p className="text-sm font-medium text-foreground">{reportTypeSummaryLabel}</p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Campaign Type
              </Label>
              <p className="text-sm font-medium text-foreground">
                {planningFiltersRelevant
                  ? campaignType === 'all'
                    ? 'All submitted campaign types'
                    : getMarketingCampaignTypeLabel(campaignType)
                  : 'Not used for this report type'}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Objective
              </Label>
              <p className="text-sm font-medium text-foreground">
                {planningFiltersRelevant
                  ? objective === 'all'
                    ? 'All submitted objectives'
                    : getMarketingObjectiveLabel(objective)
                  : 'Not used for this report type'}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label
                htmlFor="planningHorizon"
                className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
              >
                Planning Horizon
              </Label>
              <Select
                value={planningHorizon}
                onValueChange={(value) => setPlanningHorizon(value as PlanningHorizon)}
              >
                <SelectTrigger id="planningHorizon">
                  <SelectValue placeholder="Select a planning horizon" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HORIZON_CONFIG).map(([value, option]) => (
                    <SelectItem key={value} value={value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4 md:col-span-2">
              <Label
                htmlFor="budgetInput"
                className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
              >
                Planned Spend
              </Label>
              <Input
                id="budgetInput"
                type="number"
                min="0"
                step="0.01"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Recommended starting point: {formatUsdAmount(recommendedBudget)}.{' '}
                {HORIZON_CONFIG[planningHorizon].description}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-background to-emerald-50/60 p-5 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:via-background dark:to-emerald-950/20">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Planner reading
              </p>
              <div className="mt-2">
                <Badge variant="secondary">{scopeBadgeLabel}</Badge>
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {forecastSummary.lookbackWindowLabel}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Weighted spend</span>
                <span className="font-medium text-foreground">
                  {formatUsdAmount(baselineSignal.spend)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Weighted results</span>
                <span className="font-medium text-foreground">
                  {formatResultValue(baselineSignal.outcomes)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">ROAS signal</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {showRevenue && baselineSignal.roas !== null
                    ? `${baselineSignal.roas.toFixed(2)}x`
                    : 'Not available'}
                  {!showRevenue ? (
                    <TooltipProvider delayDuration={150}>
                      <UITooltip>
                        <UITooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Explain ROAS availability"
                            className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </UITooltipTrigger>
                        <UITooltipContent side="left" className="max-w-[260px]">
                          {roasUnavailableMessage}
                        </UITooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  ) : null}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium text-foreground">
                  {forecastSummary.confidenceLabel}
                </span>
              </div>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Weekly weighting
              </p>
              <div className="space-y-2">
                {forecastSummary.observedSignals.map((signal) => (
                  <div
                    key={signal.key}
                    className="rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{signal.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {signal.description} | {signal.rangeLabel}
                        </p>
                      </div>
                      <Badge variant="secondary">{Math.round(signal.weight * 100)}%</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{signal.reportCount} reports</span>
                      <span>
                        {formatUsdAmount(signal.spend)} spend | {formatResultValue(signal.outcomes)}{' '}
                        results
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {scenarioCards.map((scenario) => (
          <ScenarioCard
            key={scenario.key}
            scenario={scenario}
            resultLabel={resultLabel}
            efficiencyLabel={tacticalEfficiencyLabel}
            showRevenue={showRevenue}
            showTacticalMetrics={!isMacroScope}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs projected results</CardTitle>
          <CardDescription>
            A planner-style forecast curve showing how each scenario changes spend,{' '}
            {resultLabel.toLowerCase()}, and{' '}
            {showRevenue
              ? 'estimated sales value'
              : isMacroScope
                ? 'macro conversion volume'
                : 'tactical efficiency'}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={forecastChartData}
                margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="scenario" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="usd"
                  tickFormatter={(value) => formatCompactCurrency(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <YAxis
                  yAxisId="results"
                  orientation="right"
                  tickFormatter={(value) => formatCompactNumber(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = Number(value);
                    if (name === 'Planned Spend') {
                      return [formatUsdAmount(numericValue), name];
                    }
                    if (name === 'Projected Revenue') {
                      return [formatUsdAmount(numericValue), name];
                    }
                    return [formatResultValue(numericValue), name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="usd"
                  dataKey="spend"
                  name="Planned Spend"
                  fill="#4f46e5"
                  radius={[10, 10, 0, 0]}
                  barSize={36}
                />
                <Line
                  yAxisId="results"
                  type="monotone"
                  dataKey="projectedResults"
                  name={resultLabel}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {showRevenue && (
                  <Line
                    yAxisId="usd"
                    type="monotone"
                    dataKey="projectedRevenue"
                    name="Projected Revenue"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Signal stack</CardTitle>
            <CardDescription>
              What this forecast is using from the weighted 28-day lookback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Result metric
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {forecastSummary.topOutcomeMetric ?? 'No dominant outcome metric yet'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  ROAS coverage
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {forecastSummary.roasCoverage} of {forecastSummary.totalReports} reports
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Raw 28-day spend
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatUsdAmount(forecastSummary.totalSpend)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Weighted baseline
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatUsdAmount(forecastSummary.weightedSpend)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <InsightsSummary
          title="Forecast Notes"
          summary={insightsData.summary}
          keyFindings={insightsData.keyFindings}
          recommendations={insightsData.recommendations}
        />
      </div>
    </div>
  );
}
