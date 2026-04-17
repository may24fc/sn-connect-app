'use client';

import { useReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/csv';
import {
  formatUsdAmount,
  getMarketingCampaignTypeLabel,
  getMarketingMetricAnalyticsCategory,
  getMarketingObjectiveLabel,
  matchesMarketingReportFilters,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
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
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
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
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

type PlanningChannel = 'blended' | 'Google Ads' | 'Meta Ads';
type PlanningHorizon = 'current_window' | 'next_month' | 'next_quarter';

interface ChannelSignal {
  name: 'Google Ads' | 'Meta Ads';
  spend: number;
  outcomes: number;
  reportCount: number;
  roasTotal: number;
  roasCount: number;
}

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

interface ForecastSummary {
  totalReports: number;
  totalSpend: number;
  totalOutcomes: number;
  uniqueCampaigns: number;
  averageRoas: number | null;
  roasCoverage: number;
  topOutcomeMetric: string | null;
  topChannel: 'Google Ads' | 'Meta Ads' | null;
  topAudience: string;
  channelSignals: ChannelSignal[];
  observedSignals: Array<{ label: string; spend: number; outcomes: number }>;
  defaultChannel: PlanningChannel;
  confidenceScore: number;
  confidenceLabel: 'High' | 'Moderate' | 'Low';
  confidenceNote: string;
}

interface AnalyticsReportLike {
  status: string;
  deleted_at: string | null;
  period_start: string;
  marketing_context: {
    campaignName?: string;
    primaryChannel?: string;
    targetAudience?: string;
    campaignType?: string;
    objective?: string;
    totalSpend?: number;
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
  blockers: string[];
}

const HORIZON_CONFIG: Record<
  PlanningHorizon,
  { label: string; multiplier: number; description: string }
> = {
  current_window: {
    label: 'Current window',
    multiplier: 1,
    description: 'Keep the plan anchored to the currently selected reporting window.',
  },
  next_month: {
    label: 'Next month',
    multiplier: 1.12,
    description: 'Stretch the current signal into the next monthly budget cycle.',
  },
  next_quarter: {
    label: 'Next quarter',
    multiplier: 1.35,
    description: 'Plan for a broader budget move using the same objective and channel mix.',
  },
};

function ForecastRequirementsCard({
  showRevenue,
}: {
  showRevenue: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What Employees Must Fill In</CardTitle>
        <CardDescription>
          Forecasting activates only when submitted marketing reports include the planning fields and at least one measurable result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
          <p className="font-medium text-foreground">Required campaign setup fields</p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Campaign Type
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Objective
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Primary Channel
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Target Audience
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Total Spend greater than $0
            </li>
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
          <p className="font-medium text-foreground">Required performance signal</p>
          <p className="text-muted-foreground">
            Add at least one primary metric with a value greater than 0, such as leads, purchases, booked calls, applications, or messages.
          </p>
        </div>

        {showRevenue && (
          <div className="space-y-2 rounded-lg border border-amber-200/70 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-medium">Needed for sales value forecasting</p>
            <p>
              If you want projected revenue or sales value, employees also need to include a ROAS metric in the submitted report.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Draft reports do not count. Only submitted marketing reports inside the selected filter window are used.
        </p>
      </CardContent>
    </Card>
  );
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
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
  objective: MarketingObjectiveFilterValue,
  topOutcomeMetric: string | null
): string {
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

function isRevenueForwardObjective(objective: MarketingObjectiveFilterValue): boolean {
  return objective === 'conversions' || objective === 'catalog_sales' || objective === 'store_traffic';
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
      confidenceNote: 'Strong recent spend, result, and ROAS coverage make this forecast usable for budget decisions.',
    };
  }

  if (confidenceScore >= 50) {
    return {
      confidenceScore,
      confidenceLabel: 'Moderate',
      confidenceNote: 'Use the expected scenario as a guide, but pressure-test the channel mix before locking budget.',
    };
  }

  return {
    confidenceScore,
    confidenceLabel: 'Low',
    confidenceNote: 'The forecast is directional only. Add more submitted reports or more complete ROAS tracking before making hard commitments.',
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

function buildForecastSummary(reports: ReturnType<typeof useReports>['data'] extends infer _ ? Array<any> : never): ForecastSummary {
  const uniqueCampaigns = new Set<string>();
  const objectiveOutcomeMap = new Map<string, { total: number; count: number }>();
  const audienceMap = new Map<string, number>();
  const channelMap = new Map<'Google Ads' | 'Meta Ads', ChannelSignal>();
  const pacingMap = new Map<string, { spend: number; outcomes: number }>();

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

    totalSpend += reportSpend;
    totalOutcomes += reportOutcomes;

    if (roasMetric) {
      roasTotal += roasMetric.metric_value;
      roasCount += 1;
    }

    if (marketingContext?.campaignName) {
      uniqueCampaigns.add(marketingContext.campaignName);
    }

    if (marketingContext?.targetAudience) {
      const nextAudience = marketingContext.targetAudience.trim();
      if (nextAudience) {
        audienceMap.set(nextAudience, (audienceMap.get(nextAudience) || 0) + 1);
      }
    }

    for (const metric of outcomeMetrics) {
      const entry = objectiveOutcomeMap.get(metric.metric_name) || { total: 0, count: 0 };
      entry.total += metric.metric_value || 0;
      entry.count += 1;
      objectiveOutcomeMap.set(metric.metric_name, entry);
    }

    if (marketingContext?.primaryChannel) {
      const channelName = marketingContext.primaryChannel as 'Google Ads' | 'Meta Ads';
      const channelSignal = channelMap.get(channelName) || {
        name: channelName,
        spend: 0,
        outcomes: 0,
        reportCount: 0,
        roasTotal: 0,
        roasCount: 0,
      };
      channelSignal.spend += reportSpend;
      channelSignal.outcomes += reportOutcomes;
      channelSignal.reportCount += 1;
      if (roasMetric) {
        channelSignal.roasTotal += roasMetric.metric_value;
        channelSignal.roasCount += 1;
      }
      channelMap.set(channelName, channelSignal);
    }

    const paceKey = extractDateString(report.period_start);
    const paceEntry = pacingMap.get(paceKey) || { spend: 0, outcomes: 0 };
    paceEntry.spend += reportSpend;
    paceEntry.outcomes += reportOutcomes;
    pacingMap.set(paceKey, paceEntry);
  }

  const topOutcomeMetric = Array.from(objectiveOutcomeMap.entries())
    .sort((left, right) => {
      if (right[1].count === left[1].count) {
        return right[1].total - left[1].total;
      }
      return right[1].count - left[1].count;
    })[0]?.[0] ?? null;

  const channelSignals = Array.from(channelMap.values()).sort((left, right) => right.spend - left.spend);
  const topChannel = channelSignals[0]?.name ?? null;
  const topAudience = Array.from(audienceMap.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([audience]) => audience)
    .join(' / ');

  const observedSignals = Array.from(pacingMap.entries())
    .sort((left, right) => new Date(left[0]).getTime() - new Date(right[0]).getTime())
    .slice(-6)
    .map(([period, values]) => ({
      label: new Date(`${period}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      spend: values.spend,
      outcomes: values.outcomes,
    }));

  const confidence = getConfidenceSummary(reports.length, totalSpend, totalOutcomes, roasCount);

  return {
    totalReports: reports.length,
    totalSpend,
    totalOutcomes,
    uniqueCampaigns: uniqueCampaigns.size,
    averageRoas: roasCount > 0 ? roasTotal / roasCount : null,
    roasCoverage: roasCount,
    topOutcomeMetric,
    topChannel,
    topAudience,
    channelSignals,
    observedSignals,
    defaultChannel: topChannel ?? 'blended',
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

  return Boolean(
    marketingContext?.campaignType?.trim() &&
      marketingContext?.objective?.trim() &&
      marketingContext?.primaryChannel?.trim() &&
      marketingContext?.targetAudience?.trim()
  );
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
  const reportsWithOutcomeSignals = activeReports.filter((report) => getOutcomeTotal(report) > 0).length;
  const reportsWithRoas = activeReports.filter((report) => getRoasValue(report) !== null).length;
  const blockers: string[] = [];

  if (activeReports.length === 0) {
    blockers.push(
      archivedReports > 0
        ? `${archivedReports} matching submitted report${archivedReports === 1 ? ' is' : 's are'} archived and excluded from forecasting.`
        : 'No submitted marketing reports match the current date window and filters.'
    );
  }

  if (activeReports.length > reportsWithPlanningFields) {
    const missingPlanningCount = activeReports.length - reportsWithPlanningFields;
    blockers.push(
      `${missingPlanningCount} active report${missingPlanningCount === 1 ? ' is' : 's are'} missing campaign setup fields.`
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
          This shows exactly which submitted marketing reports are usable for the selected forecast window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Matched reports</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{diagnostics.totalMatchedReports}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active reports</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{diagnostics.activeReports}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reports with spend</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{diagnostics.reportsWithSpend}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reports with outcomes</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{diagnostics.reportsWithOutcomeSignals}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Planning fields ready: <span className="font-medium text-foreground">{diagnostics.reportsWithPlanningFields}</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Archived in window: <span className="font-medium text-foreground">{diagnostics.archivedReports}</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            Reports with ROAS: <span className="font-medium text-foreground">{diagnostics.reportsWithRoas}</span>
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
  showRevenue,
}: {
  scenario: ForecastScenario;
  resultLabel: string;
  showRevenue: boolean;
}) {
  const toneClasses = {
    zinc: 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40',
    emerald: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30',
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
            <p className="mt-1 text-sm font-medium text-foreground">{formatUsdAmount(scenario.spend)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{resultLabel}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatResultValue(scenario.projectedResults)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost per result</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {scenario.costPerResult !== null ? formatUsdAmount(scenario.costPerResult) : 'Not enough result data'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected ROAS</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {scenario.projectedRoas !== null ? `${scenario.projectedRoas.toFixed(2)}x` : 'ROAS not available'}
            </p>
          </div>
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
function getPeriodDates(
  timeRange: 'weekly' | 'monthly' | 'custom',
  customStartDate?: string,
  customEndDate?: string
): { start: string; end: string } {
  const now = new Date();

  if (timeRange === 'custom' && customStartDate && customEndDate) {
    return { start: customStartDate, end: customEndDate };
  }

  if (timeRange === 'monthly') {
    // Start of current month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    // End of current month
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: extractDateString(start.toISOString()),
      end: extractDateString(end.toISOString()),
    };
  }

  // Default to weekly - last 7 days
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);

  return {
    start: extractDateString(start.toISOString()),
    end: extractDateString(end.toISOString()),
  };
}

export function ReportsAnalyticsTab({
  department,
  campaignType,
  objective,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsAnalyticsTabProps) {
  const { start: periodStart, end: periodEnd } = getPeriodDates(
    timeRange,
    customStartDate,
    customEndDate
  );

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
          report.status !== 'draft' &&
          matchesMarketingReportFilters(report, { campaignType, objective })
      ),
    [campaignType, data?.data, objective]
  );
  const reports = useMemo(
    () => matchedReports.filter((report) => !report.deleted_at),
    [matchedReports]
  );

  const forecastSummary = useMemo(() => buildForecastSummary(reports), [reports]);
  const forecastDiagnostics = useMemo(
    () => buildForecastDiagnostics(matchedReports, reports),
    [matchedReports, reports]
  );
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>('current_window');
  const [planningChannel, setPlanningChannel] = useState<PlanningChannel>('blended');
  const [audienceFocus, setAudienceFocus] = useState('');
  const [budgetInput, setBudgetInput] = useState('0');

  const activeChannelSignal = useMemo(() => {
    if (planningChannel === 'blended') {
      return null;
    }

    return (
      forecastSummary.channelSignals.find((signal) => signal.name === planningChannel) || null
    );
  }, [forecastSummary.channelSignals, planningChannel]);

  const baselineSignal = useMemo(() => {
    const usingFallback = planningChannel !== 'blended' && !activeChannelSignal;
    const spend = activeChannelSignal?.spend ?? forecastSummary.totalSpend;
    const outcomes = activeChannelSignal?.outcomes ?? forecastSummary.totalOutcomes;
    const roas = activeChannelSignal
      ? activeChannelSignal.roasCount > 0
        ? activeChannelSignal.roasTotal / activeChannelSignal.roasCount
        : null
      : forecastSummary.averageRoas;

    return {
      spend,
      outcomes,
      roas,
      usingFallback,
    };
  }, [activeChannelSignal, forecastSummary.averageRoas, forecastSummary.totalOutcomes, forecastSummary.totalSpend, planningChannel]);

  const recommendedBudget = useMemo(
    () => baselineSignal.spend * HORIZON_CONFIG[planningHorizon].multiplier,
    [baselineSignal.spend, planningHorizon]
  );

  useEffect(() => {
    setPlanningChannel(forecastSummary.defaultChannel);
  }, [forecastSummary.defaultChannel]);

  useEffect(() => {
    setAudienceFocus(forecastSummary.topAudience);
  }, [forecastSummary.topAudience]);

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

  const outcomePerDollar = baselineSignal.spend > 0 ? baselineSignal.outcomes / baselineSignal.spend : 0;
  const resultLabel = getForecastResultLabel(objective, forecastSummary.topOutcomeMetric);
  const showRevenue = Boolean(baselineSignal.roas && baselineSignal.roas > 0);
  const scenarioCards = useMemo(() => {
    const confidenceModifier = forecastSummary.confidenceScore >= 75 ? 1 : forecastSummary.confidenceScore >= 50 ? 0.75 : 0.45;

    return SCENARIO_BLUEPRINTS.map((scenario) => {
      const spend = planBudget * scenario.spendMultiplier;
      const projectedResults = outcomePerDollar > 0
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
          baselineSignal.spend > 0 ? ((spend - baselineSignal.spend) / baselineSignal.spend) * 100 : 0,
        tone: scenario.tone,
      } satisfies ForecastScenario;
    });
  }, [baselineSignal.outcomes, baselineSignal.roas, baselineSignal.spend, forecastSummary.confidenceScore, outcomePerDollar, planBudget]);

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
        insight: `${forecastSummary.totalReports} submitted reports across ${forecastSummary.uniqueCampaigns} campaign${forecastSummary.uniqueCampaigns === 1 ? '' : 's'} in ${formatPeriodLabel(timeRange, periodStart, periodEnd)}.`,
      },
      {
        metric: 'Baseline budget signal',
        insight: `${formatUsdAmount(forecastSummary.totalSpend)} of tracked spend with ${forecastSummary.totalOutcomes.toLocaleString('en-US')} observed results.`,
        highlight: forecastSummary.totalSpend > 0 && forecastSummary.totalOutcomes > 0,
      },
      {
        metric: 'Channel bias',
        insight: forecastSummary.topChannel
          ? `${forecastSummary.topChannel} is carrying the heaviest spend signal in this forecast.`
          : 'No single channel dominates the current signal set.',
      },
      {
        metric: 'Audience snapshot',
        insight: audienceFocus || 'No target audience summary was captured in the selected reports.',
      },
      {
        metric: 'Confidence',
        insight: `${forecastSummary.confidenceLabel} confidence (${forecastSummary.confidenceScore}/100). ${forecastSummary.confidenceNote}`,
        highlight: forecastSummary.confidenceLabel !== 'Low',
      },
    ];

    const recommendations = [
      'Use the expected scenario as the planning baseline and treat conservative and aggressive as budget guardrails.',
      planningChannel !== 'blended' && baselineSignal.usingFallback
        ? `There is not enough ${planningChannel} history in the selected window, so the planner is falling back to blended Meta and Google Ads performance.`
        : `The planner is reading ${planningChannel === 'blended' ? 'blended Meta and Google Ads history' : `${planningChannel} history`} from the current filter set.`,
      showRevenue
        ? `Projected sales value is using the observed ROAS signal from ${forecastSummary.roasCoverage} report${forecastSummary.roasCoverage === 1 ? '' : 's'}.`
        : 'Revenue is hidden because the selected reports do not carry enough ROAS data. Use projected results and cost efficiency instead.',
      forecastSummary.confidenceLabel === 'Low'
        ? 'Broaden the date range or tighten the filters to a cleaner objective cluster before using this for committed spend changes.'
        : 'Keep the same employee-side report structure intact so future forecasts continue to compare campaign type, objective, channel, audience, and spend cleanly.',
    ];

    return {
      summary: `This planner follows the same campaign structure employees submit on marketing reports and translates recent Meta Ads and Google Ads performance into concurrent sales forecast scenarios for ${resultLabel.toLowerCase()}.`,
      keyFindings,
      recommendations,
    };
  }, [audienceFocus, baselineSignal.usingFallback, forecastSummary.confidenceLabel, forecastSummary.confidenceNote, forecastSummary.confidenceScore, forecastSummary.roasCoverage, forecastSummary.topChannel, forecastSummary.totalOutcomes, forecastSummary.totalReports, forecastSummary.totalSpend, forecastSummary.uniqueCampaigns, periodEnd, periodStart, planningChannel, resultLabel, showRevenue, timeRange]);

  const handleExport = () => {
    if (scenarioCards.length === 0) return;

    exportToCsv(scenarioCards, {
      filename: `marketing-sales-forecast-${timeRange}`,
      headers: [
        'Scenario',
        'Planning Horizon',
        'Planning Channel',
        'Audience Focus',
        'Projected Result Label',
        'Planned Spend (USD)',
        'Projected Results',
        'Projected Revenue (USD)',
        'Projected ROAS',
        'Projected Cost Per Result (USD)',
      ],
      rowMapper: (scenario) => [
        scenario.label,
        HORIZON_CONFIG[planningHorizon].label,
        planningChannel,
        audienceFocus,
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
              title="Forecasting is waiting for submitted marketing reports"
              description={forecastDiagnostics.blockers[0] ?? 'To activate this forecast, employees need to submit marketing reports for the selected period with campaign setup details, spend, and at least one real result metric.'}
              size="sm"
            />
          </CardContent>
        </Card>
        <ForecastDiagnosticsCard diagnostics={forecastDiagnostics} />
        <ForecastRequirementsCard showRevenue={showRevenue} />
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
              description={forecastDiagnostics.blockers[0] ?? 'Reports exist for this filter, but the submitted entries still do not include enough tracked spend or outcome values to build a forecast.'}
              size="sm"
            />
          </CardContent>
        </Card>
        <ForecastDiagnosticsCard diagnostics={forecastDiagnostics} />
        <ForecastRequirementsCard showRevenue={showRevenue} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing sales forecast scenarios for the <span className="font-medium text-foreground">Marketing team</span>{' '}
          {campaignType !== 'all' ? `| ${getMarketingCampaignTypeLabel(campaignType)} ` : ''}
          {objective !== 'all' ? `| ${getMarketingObjectiveLabel(objective)} ` : ''}
          ({timeRange}
          {timeRange === 'custom' && customStartDate && customEndDate
            ? `: ${customStartDate} to ${customEndDate}`
            : ''}
          )
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!scenarioCards.length}>
          <Download className="h-4 w-4 mr-2" />
          Export forecast
        </Button>
      </div>

      <MetricKPICardGrid>
        <MetricKPICard
          label="Observed Spend"
          value={formatCompactCurrency(forecastSummary.totalSpend)}
          change={{
            absolute: `${forecastSummary.totalReports} submitted reports`,
            trend: 'stable',
          }}
          color="blue"
        />
        <MetricKPICard
          label={resultLabel}
          value={forecastSummary.totalOutcomes.toLocaleString('en-US')}
          change={{
            absolute: `${forecastSummary.uniqueCampaigns} active campaigns`,
            trend: 'stable',
          }}
          color="green"
        />
        <MetricKPICard
          label={showRevenue ? 'Observed ROAS' : 'Cost Per Result'}
          value={
            showRevenue && forecastSummary.averageRoas !== null
              ? `${forecastSummary.averageRoas.toFixed(2)}x`
              : formatCurrency(forecastSummary.totalSpend / Math.max(forecastSummary.totalOutcomes, 1))
          }
          change={{
            absolute: showRevenue
              ? `${forecastSummary.roasCoverage}/${forecastSummary.totalReports} reports include ROAS`
              : 'Revenue remains hidden until ROAS is recorded',
            trend: 'stable',
          }}
          color="orange"
        />
        <MetricKPICard
          label="Forecast Confidence"
          value={forecastSummary.confidenceLabel}
          change={{ absolute: `${forecastSummary.confidenceScore}/100 signal score`, trend: 'stable' }}
          color="blue"
        />
      </MetricKPICardGrid>

      <Card>
        <CardHeader>
          <CardTitle>Sales Forecast Setup</CardTitle>
          <CardDescription>
            This planner mirrors the employee marketing report structure: campaign type, objective, primary channel, target audience, and spend. The result is a Google-style budget planner with Meta-style estimated-results assumptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Campaign Type</Label>
              <p className="text-sm font-medium text-foreground">
                {campaignType === 'all' ? 'All submitted campaign types' : getMarketingCampaignTypeLabel(campaignType)}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Objective</Label>
              <p className="text-sm font-medium text-foreground">
                {objective === 'all' ? 'All submitted objectives' : getMarketingObjectiveLabel(objective)}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label htmlFor="planningChannel" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary Channel</Label>
              <Select value={planningChannel} onValueChange={(value) => setPlanningChannel(value as PlanningChannel)}>
                <SelectTrigger id="planningChannel">
                  <SelectValue placeholder="Select a planning channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blended">Blended Meta + Google</SelectItem>
                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4">
              <Label htmlFor="planningHorizon" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Planning Horizon</Label>
              <Select value={planningHorizon} onValueChange={(value) => setPlanningHorizon(value as PlanningHorizon)}>
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
              <Label htmlFor="audienceFocus" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Target Audience</Label>
              <Input
                id="audienceFocus"
                value={audienceFocus}
                onChange={(event) => setAudienceFocus(event.target.value)}
                placeholder="Audience summary from employee-side marketing reports"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-4 md:col-span-2">
              <Label htmlFor="budgetInput" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Planned Spend</Label>
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
                Recommended starting point: {formatUsdAmount(recommendedBudget)}. {HORIZON_CONFIG[planningHorizon].description}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-background to-emerald-50/60 p-5 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:via-background dark:to-emerald-950/20">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Planner reading</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{formatPeriodLabel(timeRange, periodStart, periodEnd)}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Channel signal</span>
                <span className="font-medium text-foreground">
                  {planningChannel === 'blended' || !baselineSignal.usingFallback ? planningChannel : 'Blended Meta + Google'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Observed spend</span>
                <span className="font-medium text-foreground">{formatUsdAmount(baselineSignal.spend)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Observed results</span>
                <span className="font-medium text-foreground">{formatResultValue(baselineSignal.outcomes)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">ROAS signal</span>
                <span className="font-medium text-foreground">
                  {baselineSignal.roas !== null ? `${baselineSignal.roas.toFixed(2)}x` : 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium text-foreground">{forecastSummary.confidenceLabel}</span>
              </div>
            </div>
            {baselineSignal.usingFallback && (
              <p className="text-xs text-muted-foreground">
                The selected channel does not have enough history in this filter set, so the planner is falling back to blended performance.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {scenarioCards.map((scenario) => (
          <ScenarioCard
            key={scenario.key}
            scenario={scenario}
            resultLabel={resultLabel}
            showRevenue={showRevenue && isRevenueForwardObjective(objective)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs projected results</CardTitle>
          <CardDescription>
            A planner-style forecast curve showing how each scenario changes spend, {resultLabel.toLowerCase()}, and {showRevenue ? 'estimated sales value' : 'efficiency'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastChartData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
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
              What this forecast is using from the submitted marketing reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Top channel</p>
                <p className="mt-1 text-sm font-medium text-foreground">{forecastSummary.topChannel ?? 'No dominant channel yet'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Audience snapshot</p>
                <p className="mt-1 text-sm font-medium text-foreground">{forecastSummary.topAudience || 'No audience summary yet'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Result metric</p>
                <p className="mt-1 text-sm font-medium text-foreground">{forecastSummary.topOutcomeMetric ?? 'No dominant outcome metric yet'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ROAS coverage</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {forecastSummary.roasCoverage} of {forecastSummary.totalReports} reports
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Channel spend mix</p>
              {forecastSummary.channelSignals.length > 0 ? (
                forecastSummary.channelSignals.map((signal) => {
                  const share = forecastSummary.totalSpend > 0 ? (signal.spend / forecastSummary.totalSpend) * 100 : 0;

                  return (
                    <div key={signal.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{signal.name}</span>
                        <span className="text-muted-foreground">
                          {formatUsdAmount(signal.spend)} · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.max(share, signal.spend > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No channel split has been recorded yet.</p>
              )}
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
