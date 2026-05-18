'use client';

import { type MetricComparison, type WeekComparison, cn } from '@hr-portal/ui';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import * as React from 'react';

export interface CompareCampaignSummaryItem {
  key: string;
  campaignName: string;
  reportTypeLabel: string;
  campaignTypeLabel: string | null;
  objectiveLabel: string | null;
  totalSpend: number;
  summary: string;
  reportCount: number;
  appearsInOppositePeriod: boolean;
  comparisonLabel: string;
}

export interface CompareCampaignSummaries {
  previous: CompareCampaignSummaryItem[];
  current: CompareCampaignSummaryItem[];
}

interface CampaignComparisonRow {
  key: string;
  campaignName: string;
  reportTypeLabel: string;
  campaignTypeLabel: string | null;
  objectiveLabel: string | null;
  previous: CompareCampaignSummaryItem | null;
  current: CompareCampaignSummaryItem | null;
}

interface MetricTableGroupRow {
  type: 'group';
  key: string;
  label: string;
}

interface MetricTableValueRow {
  type: 'metric';
  key: string;
  label: string;
  metric: MetricComparison;
  visualIndex: number;
  isNested: boolean;
}

type MetricTableRow = MetricTableGroupRow | MetricTableValueRow;

interface CompareExecutiveDashboardProps {
  comparison: WeekComparison;
  campaignSummaries?: CompareCampaignSummaries;
  className?: string;
}

const POSITIVE = '#22C55E';
const NEGATIVE = '#EF4444';
const NEUTRAL = '#94A3B8';
const MAIN = '#1E293B';
const ACCENT = '#7C93B7';

function normalizeMetricName(name: string): string {
  return name.trim().toLowerCase();
}

function isContentCreationLabel(value: string | null | undefined): boolean {
  return normalizeMetricName(value ?? '') === 'content creation';
}

function getDisplayMetricName(name: string): string {
  if (name.startsWith('App: ')) {
    return name.replace(/^App:\s*/, 'Posts: ');
  }

  return name === 'Total Reports' ? 'Total Submissions' : name;
}

function getFallbackMetric(
  name: 'Total Reports' | 'Link Clicks' | 'CTR' | 'Total Spend' | 'Unique Campaigns' | 'Unique Apps'
): MetricComparison {
  return {
    name,
    category: '',
    unit:
      name === 'CTR'
        ? '%'
        : name === 'Link Clicks'
          ? 'count'
          : name === 'Total Spend'
            ? 'AUD'
            : null,
    currentValue: 0,
    previousValue: 0,
    change: 0,
    changePercent: 0,
    trend: 'stable',
  };
}

function formatMetricValue(value: number, unit?: string | null): string {
  const normalizedUnit = unit?.trim().toLowerCase() ?? '';

  if (normalizedUnit === 'count') {
    return Math.round(value).toLocaleString('en-US');
  }

  if (normalizedUnit === 'php') {
    return `Php${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (normalizedUnit === 'usd' || normalizedUnit === 'aud') {
    return `AU$${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (normalizedUnit === '%') {
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    })}%`;
  }

  if (normalizedUnit === 'x') {
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    })}x`;
  }

  if (unit) {
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    })} ${unit}`;
  }

  return value.toLocaleString('en-US');
}

function parseReportDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00.000Z`);
}

function formatReportDateRange(startDate: string, endDate: string): string {
  const start = parseReportDate(startDate);
  const end = parseReportDate(endDate);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const endDay = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const startYear = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
  const endYear = end.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
}

function getChangeTone(metric: MetricComparison): 'positive' | 'negative' | 'neutral' {
  if (metric.trend === 'stable' || metric.change === 0) {
    return 'neutral';
  }

  const increaseIsNegative = normalizeMetricName(metric.name).includes('bounce rate');
  const isIncrease = metric.change > 0;
  const isPositive = increaseIsNegative ? !isIncrease : isIncrease;

  return isPositive ? 'positive' : 'negative';
}

function getToneStyles(tone: 'positive' | 'negative' | 'neutral'): {
  pillClassName: string;
  changeClassName: string;
  strokeColor: string;
} {
  if (tone === 'positive') {
    return {
      pillClassName: 'bg-[#22C55E]/12 text-[#166534]',
      changeClassName: 'text-[#22C55E]',
      strokeColor: POSITIVE,
    };
  }

  if (tone === 'negative') {
    return {
      pillClassName: 'bg-[#EF4444]/12 text-[#991B1B]',
      changeClassName: 'text-[#EF4444]',
      strokeColor: NEGATIVE,
    };
  }

  return {
    pillClassName: 'bg-[#EEF4FF] text-[#5D7399]',
    changeClassName: 'text-zinc-500',
    strokeColor: NEUTRAL,
  };
}

function formatChangePercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatChangeValue(metric: MetricComparison): string {
  const normalizedUnit = metric.unit?.trim().toLowerCase() ?? '';

  if (normalizedUnit === '%') {
    return `${metric.change > 0 ? '+' : ''}${metric.change.toFixed(1)} pts`;
  }

  return formatChangePercent(metric.changePercent);
}

function calculatePercentChange(currentValue: number, previousValue: number): number {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function getDeltaTone(changePercent: number): 'positive' | 'negative' | 'neutral' {
  if (Math.abs(changePercent) < 0.05) {
    return 'neutral';
  }

  return changePercent > 0 ? 'positive' : 'negative';
}

function getDeltaDescriptor(changePercent: number): string {
  if (Math.abs(changePercent) < 0.05) {
    return 'No material change';
  }

  return `${formatChangePercent(changePercent)} ${changePercent > 0 ? '↑' : '↓'}`;
}

function getOptionalMetric(
  metrics: MetricComparison[],
  metricName:
    | 'Total Reports'
    | 'Link Clicks'
    | 'CTR'
    | 'Total Spend'
    | 'Unique Campaigns'
    | 'Unique Apps'
): MetricComparison | null {
  return (
    metrics.find(
      (metric) => normalizeMetricName(metric.name) === normalizeMetricName(metricName)
    ) ?? null
  );
}

function describeMetricShift(metric: MetricComparison, subject: string): string {
  const currentValue = formatMetricValue(metric.currentValue, metric.unit);

  if (metric.change === 0) {
    return `${subject} held steady at ${currentValue}`;
  }

  if (metric.change > 0) {
    return `${subject} increased by ${Math.abs(metric.changePercent).toFixed(1)}% to ${currentValue}`;
  }

  return `${subject} was scaled back by ${Math.abs(metric.changePercent).toFixed(1)}% to ${currentValue}`;
}

function buildExecutiveNarrative(
  metrics: MetricComparison[],
  campaignSummaries?: CompareCampaignSummaries,
  showSpend = true
): string {
  const spendMetric = findMetric(metrics, 'Total Spend');
  const submissionsMetric = findMetric(metrics, 'Total Reports');
  const activeCampaignsMetric = getOptionalMetric(metrics, 'Unique Campaigns');
  const activeAppsMetric = getOptionalMetric(metrics, 'Unique Apps');
  const leadCampaign = campaignSummaries?.current[0] ?? campaignSummaries?.previous[0] ?? null;

  if (submissionsMetric.currentValue === 0 && submissionsMetric.previousValue === 0) {
    return 'No submitted marketing reports matched the selected comparison periods yet.';
  }

  const leadCampaignSentence = leadCampaign
    ? leadCampaign.appearsInOppositePeriod
      ? `${leadCampaign.campaignName}${leadCampaign.objectiveLabel ? ` remained anchored to ${leadCampaign.objectiveLabel}` : ' remained the lead campaign'} across both periods.`
      : `${leadCampaign.campaignName}${leadCampaign.objectiveLabel ? ` led the current mix around ${leadCampaign.objectiveLabel}` : ' led the current mix'} this period.`
    : activeAppsMetric
      ? `Active publishing apps moved from ${formatMetricValue(activeAppsMetric.previousValue, activeAppsMetric.unit)} to ${formatMetricValue(activeAppsMetric.currentValue, activeAppsMetric.unit)} across the selected windows.`
      : activeCampaignsMetric
        ? `Active campaign count moved from ${formatMetricValue(activeCampaignsMetric.previousValue, activeCampaignsMetric.unit)} to ${formatMetricValue(activeCampaignsMetric.currentValue, activeCampaignsMetric.unit)} across the selected windows.`
        : 'Campaign activity remained limited across the selected windows.';

  if (!showSpend) {
    const appSentence = activeAppsMetric
      ? `Published app coverage moved from ${formatMetricValue(activeAppsMetric.previousValue, activeAppsMetric.unit)} to ${formatMetricValue(activeAppsMetric.currentValue, activeAppsMetric.unit)} across the selected windows.`
      : leadCampaignSentence;

    return `During the current period, ${describeMetricShift(submissionsMetric, 'overall submitted report volume')}. ${appSentence}`;
  }

  return `During the current period, ${describeMetricShift(spendMetric, 'spend')}, while ${describeMetricShift(submissionsMetric, 'overall submitted report volume')}. ${leadCampaignSentence}`;
}

function buildSparklinePoints(metric: MetricComparison): string {
  const values = [metric.previousValue, metric.currentValue];
  const width = 88;
  const height = 26;
  const padding = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const horizontalStep = (width - padding * 2) / (values.length - 1 || 1);

  if (max === min) {
    const centeredY = height / 2;

    return values
      .map((_, index) => {
        const x = padding + horizontalStep * index;
        return `${x},${centeredY}`;
      })
      .join(' ');
  }

  const range = max - min;

  return values
    .map((value, index) => {
      const x = padding + horizontalStep * index;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

function TrendSparkline({ metric }: { metric: MetricComparison }): React.ReactElement {
  const tone = getChangeTone(metric);
  const toneStyles = getToneStyles(tone);
  const points = buildSparklinePoints(metric).split(' ');

  return (
    <svg viewBox="0 0 88 26" className="h-7 w-24 overflow-visible" aria-hidden="true">
      <polyline
        fill="none"
        stroke={toneStyles.strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={buildSparklinePoints(metric)}
      />
      {points.map((point) => {
        const [cx, cy] = point.split(',');
        return (
          <circle
            key={point}
            cx={cx}
            cy={cy}
            r="2.75"
            fill={toneStyles.strokeColor}
            className="drop-shadow-sm"
          />
        );
      })}
    </svg>
  );
}

function findMetric(
  metrics: MetricComparison[],
  metricName:
    | 'Total Reports'
    | 'Link Clicks'
    | 'CTR'
    | 'Total Spend'
    | 'Unique Campaigns'
    | 'Unique Apps'
): MetricComparison {
  return (
    metrics.find(
      (metric) => normalizeMetricName(metric.name) === normalizeMetricName(metricName)
    ) ?? getFallbackMetric(metricName)
  );
}

// function KPISection({ metrics }: { metrics: MetricComparison[] }): React.ReactElement {
//   const prioritizedMetrics = [
//     findMetric(metrics, 'Total Reports'),
//     findMetric(metrics, 'Link Clicks'),
//     findMetric(metrics, 'CTR'),
//   ];

//   return (
//     <div className="grid gap-4 md:grid-cols-3">
//       {prioritizedMetrics.map((metric) => {
//         const tone = getChangeTone(metric);
//         const toneStyles = getToneStyles(tone);

//         return (
//           <div
//             key={metric.name}
//             className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_42px_rgba(2,6,23,0.3)]"
//           >
//             <div className="flex items-start justify-between gap-3">
//               <div>
//                 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
//                   {getDisplayMetricName(metric.name)}
//                 </p>
//                 <p className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
//                   {formatMetricValue(metric.currentValue, metric.unit)}
//                 </p>
//               </div>
//               <span
//                 className={cn(
//                   'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
//                   toneStyles.pillClassName
//                 )}
//               >
//                 {formatChangeValue(metric)}
//               </span>
//             </div>
//             <div className="mt-5 flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
//               <span>Previous: {formatMetricValue(metric.previousValue, metric.unit)}</span>
//               <TrendSparkline metric={metric} />
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

function SummaryMetricStat({
  label,
  metric,
  period,
}: {
  label: string;
  metric: MetricComparison;
  period: 'previous' | 'current';
}): React.ReactElement {
  const value = period === 'previous' ? metric.previousValue : metric.currentValue;
  const showDelta = period === 'current';
  const toneStyles = getToneStyles(getChangeTone(metric));

  return (
    <div className="rounded-[14px] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        {showDelta ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
              toneStyles.pillClassName
            )}
          >
            {getDeltaDescriptor(metric.changePercent)}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
        {formatMetricValue(value, metric.unit)}
      </p>
    </div>
  );
}

function SummaryPeriodCard({
  title,
  dateRange,
  metrics,
  period,
  showSpend,
}: {
  title: string;
  dateRange: string;
  metrics: MetricComparison[];
  period: 'previous' | 'current';
  showSpend: boolean;
}): React.ReactElement {
  const totalSpend = findMetric(metrics, 'Total Spend');
  const totalReports = findMetric(metrics, 'Total Reports');
  const activeCampaigns = getOptionalMetric(metrics, 'Unique Campaigns');
  const activeApps = getOptionalMetric(metrics, 'Unique Apps');
  const activityMetric = activeApps ?? activeCampaigns;
  const activityLabel = activeApps ? 'Active apps' : 'Active campaigns';
  const accentClasses =
    period === 'current'
      ? 'border-[#CBD8EE] bg-[#EEF4FF] dark:border-[#466288] dark:bg-[#172235]'
      : 'border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950';

  return (
    <div className={cn('rounded-[16px] border p-5 shadow-sm', accentClasses)}>
      <div className="flex flex-col gap-2 border-b border-black/5 pb-4 dark:border-white/10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#5D7399] dark:text-[#AFC2E5]">
            {title}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{dateRange}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {period === 'current' ? 'Current snapshot' : 'Comparison baseline'}
        </p>
      </div>

      <div className={cn('mt-4 grid gap-4', showSpend ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
        {showSpend ? <SummaryMetricStat label="Spend" metric={totalSpend} period={period} /> : null}
        <SummaryMetricStat label="Submitted Reports" metric={totalReports} period={period} />
      </div>

      <div className="mt-4 rounded-[12px] border border-black/5 bg-black/[0.02] px-4 py-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
        {activityLabel}:{' '}
        {activityMetric
          ? formatMetricValue(
              period === 'previous' ? activityMetric.previousValue : activityMetric.currentValue,
              activityMetric.unit
            )
          : '0'}
      </div>
    </div>
  );
}

function mergeCampaignSummaries(
  campaignSummaries: CompareCampaignSummaries
): CampaignComparisonRow[] {
  const previousMap = new Map(
    campaignSummaries.previous.map((campaign) => [campaign.key, campaign])
  );
  const currentMap = new Map(campaignSummaries.current.map((campaign) => [campaign.key, campaign]));
  const allKeys = new Set([...previousMap.keys(), ...currentMap.keys()]);

  return Array.from(allKeys)
    .map((key) => {
      const previous = previousMap.get(key) ?? null;
      const current = currentMap.get(key) ?? null;
      const primary = current ?? previous;

      if (!primary) {
        return null;
      }

      return {
        key,
        campaignName: primary.campaignName,
        reportTypeLabel: primary.reportTypeLabel,
        campaignTypeLabel: primary.campaignTypeLabel,
        objectiveLabel: primary.objectiveLabel,
        previous,
        current,
      } satisfies CampaignComparisonRow;
    })
    .filter((campaign): campaign is CampaignComparisonRow => campaign !== null)
    .sort((left, right) => {
      const leftSpend = (left.current?.totalSpend ?? 0) + (left.previous?.totalSpend ?? 0);
      const rightSpend = (right.current?.totalSpend ?? 0) + (right.previous?.totalSpend ?? 0);

      if (rightSpend !== leftSpend) {
        return rightSpend - leftSpend;
      }

      return left.campaignName.localeCompare(right.campaignName, 'en-US', {
        sensitivity: 'base',
      });
    });
}

function CampaignPresenceBadge({
  comparison,
}: {
  comparison: CampaignComparisonRow;
}): React.ReactElement {
  const label =
    comparison.previous && comparison.current
      ? 'Tracked in both periods'
      : comparison.current
        ? 'New this period'
        : 'Only in previous period';
  const badgeClasses =
    comparison.previous && comparison.current
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20'
      : comparison.current
        ? 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20'
        : 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20';

  return (
    <span className={cn('rounded-full px-2.5 py-1 ring-1 ring-inset', badgeClasses)}>{label}</span>
  );
}

function isContentCreationComparison(comparison: CampaignComparisonRow): boolean {
  return (
    isContentCreationLabel(comparison.reportTypeLabel) ||
    isContentCreationLabel(comparison.previous?.reportTypeLabel) ||
    isContentCreationLabel(comparison.current?.reportTypeLabel) ||
    isContentCreationLabel(comparison.campaignName)
  );
}

function CampaignPeriodSnapshot({
  title,
  dateRange,
  campaign,
  showSpend,
}: {
  title: string;
  dateRange: string;
  campaign: CompareCampaignSummaryItem | null;
  showSpend: boolean;
}): React.ReactElement {
  return (
    <div className="rounded-[16px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5D7399] dark:text-[#AFC2E5]">
            {title}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{dateRange}</p>
        </div>
        {campaign ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {campaign.reportCount} report{campaign.reportCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {campaign ? (
        <>
          {showSpend ? (
            <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {formatMetricValue(campaign.totalSpend, 'AUD')}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-zinc-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden dark:text-zinc-300">
            {campaign.summary}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-[12px] border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No matching campaign summary for this period.
        </div>
      )}
    </div>
  );
}

function CampaignDeltaPanel({
  previous,
  current,
  showSpend,
}: {
  previous: CompareCampaignSummaryItem | null;
  current: CompareCampaignSummaryItem | null;
  showSpend: boolean;
}): React.ReactElement {
  if (!previous || !current) {
    const statusText = current
      ? 'This campaign is new in the current period, so there is no previous baseline yet.'
      : 'This campaign dropped out of the current period after appearing in the previous window.';

    return (
      <div className="rounded-[16px] border border-dashed border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        {statusText}
      </div>
    );
  }

  const spendChange = calculatePercentChange(current.totalSpend, previous.totalSpend);
  const reportCountChange = calculatePercentChange(current.reportCount, previous.reportCount);
  const spendToneStyles = getToneStyles(getDeltaTone(spendChange));
  const reportToneStyles = getToneStyles(getDeltaTone(reportCountChange));

  return (
    <div className="rounded-[16px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
        Delta
      </p>

      <div className="mt-4 space-y-3">
        {showSpend ? (
          <div className="rounded-[14px] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Spend change
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                  spendToneStyles.pillClassName
                )}
              >
                {getDeltaDescriptor(spendChange)}
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {formatMetricValue(previous.totalSpend, 'AUD')} →{' '}
              {formatMetricValue(current.totalSpend, 'AUD')}
            </p>
          </div>
        ) : null}

        <div className="rounded-[14px] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Report count change
            </p>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                reportToneStyles.pillClassName
              )}
            >
              {getDeltaDescriptor(reportCountChange)}
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {formatMetricValue(previous.reportCount, 'count')} →{' '}
            {formatMetricValue(current.reportCount, 'count')}
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignComparisonCard({
  comparison,
  previousDateRange,
  currentDateRange,
}: {
  comparison: CampaignComparisonRow;
  previousDateRange: string;
  currentDateRange: string;
}): React.ReactElement {
  const primary = comparison.current ?? comparison.previous;
  const showSpend = !isContentCreationComparison(comparison);

  if (!primary) {
    return <></>;
  }

  return (
    <div className="rounded-[20px] border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-[0_12px_28px_rgba(2,6,23,0.2)]">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            {comparison.campaignName}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              {comparison.reportTypeLabel}
            </span>
            {comparison.campaignTypeLabel ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                {comparison.campaignTypeLabel}
              </span>
            ) : null}
            {comparison.objectiveLabel ? (
              <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[#5D7399] dark:bg-[#1B2940] dark:text-[#AFC2E5]">
                {comparison.objectiveLabel}
              </span>
            ) : null}
            <CampaignPresenceBadge comparison={comparison} />
          </div>
        </div>

        {showSpend ? (
          <div className="text-left lg:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              Peak spend across compared periods
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {formatMetricValue(
                Math.max(comparison.previous?.totalSpend ?? 0, comparison.current?.totalSpend ?? 0),
                'AUD'
              )}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
        <CampaignPeriodSnapshot
          title="Previous Period"
          dateRange={previousDateRange}
          campaign={comparison.previous}
          showSpend={showSpend}
        />
        <CampaignPeriodSnapshot
          title="Current Period"
          dateRange={currentDateRange}
          campaign={comparison.current}
          showSpend={showSpend}
        />
        <CampaignDeltaPanel
          previous={comparison.previous}
          current={comparison.current}
          showSpend={showSpend}
        />
      </div>
    </div>
  );
}

function CampaignSummarySection({
  comparison,
  campaignSummaries,
}: {
  comparison: WeekComparison;
  campaignSummaries: CompareCampaignSummaries;
}): React.ReactElement | null {
  const campaignComparisons = mergeCampaignSummaries(campaignSummaries);
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (campaignComparisons.length === 0) {
    return null;
  }

  const visibleComparisons = isExpanded ? campaignComparisons : campaignComparisons.slice(0, 4);
  const hiddenCount = Math.max(campaignComparisons.length - 4, 0);
  const previousDateRange = formatReportDateRange(
    comparison.previousWeek.startDate,
    comparison.previousWeek.endDate
  );
  const currentDateRange = formatReportDateRange(
    comparison.currentWeek.startDate,
    comparison.currentWeek.endDate
  );

  return (
    <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]">
      <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#7C93B7]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7C93B7]">
                Campaign Comparison
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Shared campaigns are stacked into one row so the period-over-period change is visible
              without scanning across separate columns.
            </p>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Campaign cards follow the same campaign type and objective filters as the compare
            metrics.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {visibleComparisons.map((campaign) => (
          <CampaignComparisonCard
            key={campaign.key}
            comparison={campaign}
            previousDateRange={previousDateRange}
            currentDateRange={currentDateRange}
          />
        ))}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#7C93B7] hover:text-[#1E293B] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-[#466288] dark:hover:text-white"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isExpanded
              ? 'Show fewer campaign comparisons'
              : `Show ${hiddenCount} more campaign comparison${hiddenCount === 1 ? '' : 's'}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PeriodHeader({
  comparison,
  metrics,
  campaignSummaries,
  showSpend,
}: {
  comparison: WeekComparison;
  metrics: MetricComparison[];
  campaignSummaries: CompareCampaignSummaries | undefined;
  showSpend: boolean;
}): React.ReactElement {
  const narrative = buildExecutiveNarrative(metrics, campaignSummaries, showSpend);

  return (
    <div className="rounded-[12px] border border-zinc-200 bg-gradient-to-br from-white via-slate-50 to-[#EEF4FF] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-gradient-to-br dark:from-[#1E293B] dark:via-[#273449] dark:to-[#334155] dark:shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary-700 dark:text-primary-200">
            Executive Comparison
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Submitted report performance by reporting period
          </h3>
        </div>
        <p className="text-sm text-zinc-600 dark:text-white/75">
          Dates reflect the exact reporting windows selected from submitted reports.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <SummaryPeriodCard
          title="Previous Period"
          dateRange={formatReportDateRange(
            comparison.previousWeek.startDate,
            comparison.previousWeek.endDate
          )}
          metrics={metrics}
          period="previous"
          showSpend={showSpend}
        />
        <SummaryPeriodCard
          title="Current Period"
          dateRange={formatReportDateRange(
            comparison.currentWeek.startDate,
            comparison.currentWeek.endDate
          )}
          metrics={metrics}
          period="current"
          showSpend={showSpend}
        />
      </div>

      <div className="mt-4 rounded-[16px] border border-white/50 bg-white/70 px-5 py-4 text-sm leading-6 text-zinc-700 shadow-sm dark:border-white/10 dark:bg-[#111C2C]/60 dark:text-zinc-200">
        {narrative}
      </div>
    </div>
  );
}

function getTableMetrics(metrics: MetricComparison[]): MetricComparison[] {
  return [...metrics]
    .filter((metric) => {
      const normalizedName = normalizeMetricName(metric.name);

      if (normalizedName === 'total reports' || normalizedName === 'total spend') {
        return false;
      }

      if (normalizedName.startsWith('campaign type:')) {
        return false;
      }

      if (normalizedName.startsWith('objective:')) {
        return false;
      }

      return true;
    })
    .sort((left, right) =>
      getDisplayMetricName(left.name).localeCompare(getDisplayMetricName(right.name), 'en-US', {
        sensitivity: 'base',
      })
    );
}

function getMetricTableLabelParts(name: string): {
  groupLabel: string | null;
  metricLabel: string;
} {
  const displayName = getDisplayMetricName(name);
  const dashIndex = displayName.indexOf(' - ');

  if (dashIndex > 0) {
    return {
      groupLabel: displayName.slice(0, dashIndex).trim(),
      metricLabel: displayName.slice(dashIndex + 3).trim(),
    };
  }

  const colonIndex = displayName.indexOf(': ');

  if (colonIndex > 0) {
    return {
      groupLabel: displayName.slice(0, colonIndex).trim(),
      metricLabel: displayName.slice(colonIndex + 2).trim(),
    };
  }

  return {
    groupLabel: null,
    metricLabel: displayName,
  };
}

function buildMetricTableRows(metrics: MetricComparison[]): MetricTableRow[] {
  const rows: MetricTableRow[] = [];
  const renderedGroups = new Set<string>();
  let visualIndex = 0;

  for (const metric of metrics) {
    const { groupLabel, metricLabel } = getMetricTableLabelParts(metric.name);

    if (groupLabel && !renderedGroups.has(groupLabel)) {
      renderedGroups.add(groupLabel);
      rows.push({
        type: 'group',
        key: `group-${groupLabel}`,
        label: groupLabel,
      });
    }

    rows.push({
      type: 'metric',
      key: `metric-${metric.name}`,
      label: metricLabel,
      metric,
      visualIndex,
      isNested: groupLabel !== null,
    });
    visualIndex += 1;
  }

  return rows;
}

export function CompareExecutiveDashboard({
  comparison,
  campaignSummaries,
  className,
}: CompareExecutiveDashboardProps): React.ReactNode {
  const metrics = comparison.metrics;
  const tableMetrics = getTableMetrics(comparison.metrics);
  const tableRows = buildMetricTableRows(tableMetrics);
  const hasContentCreationMetrics = tableMetrics.some((metric) =>
    normalizeMetricName(metric.name).startsWith('app: ')
  );
  const allCampaignSummaryItems = campaignSummaries
    ? [...campaignSummaries.previous, ...campaignSummaries.current]
    : [];
  const hasOnlyContentCreationSummaries =
    allCampaignSummaryItems.length > 0 &&
    allCampaignSummaryItems.every((item) => isContentCreationLabel(item.reportTypeLabel));
  const showSpend = !(hasContentCreationMetrics || hasOnlyContentCreationSummaries);

  return (
    <div className={cn('space-y-6', className)}>
      <PeriodHeader
        comparison={comparison}
        metrics={metrics}
        campaignSummaries={campaignSummaries}
        showSpend={showSpend}
      />

      {campaignSummaries ? (
        <CampaignSummarySection comparison={comparison} campaignSummaries={campaignSummaries} />
      ) : null}

      {/* <KPISection metrics={metrics} /> */}

      <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]">
        <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: ACCENT }}
          >
            Metric Breakdown
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {hasContentCreationMetrics
              ? 'Executive comparison of app-level publishing volume across the selected reporting dates.'
              : 'Executive comparison of campaign performance across the selected reporting dates.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 font-sans text-sm">
            <thead>
              <tr className="bg-zinc-50 text-xs uppercase tracking-[0.2em] text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
                <th className="w-[34%] px-6 py-4 text-left font-semibold">Metric</th>
                <th className="w-[14%] px-6 py-4 text-right font-semibold">Previous</th>
                <th className="w-[14%] px-6 py-4 text-right font-semibold">Current</th>
                <th className="w-[20%] px-6 py-4 text-center font-semibold">Trend</th>
                <th className="w-[18%] px-6 py-4 text-right font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No metrics to compare.
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => {
                  if (row.type === 'group') {
                    return (
                      <tr key={row.key} className="bg-[#F7FAFF] dark:bg-[#111C2C]/80">
                        <td
                          colSpan={5}
                          className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5D7399] dark:text-[#AFC2E5]"
                        >
                          {row.label}
                        </td>
                      </tr>
                    );
                  }

                  const { metric } = row;
                  const tone = getChangeTone(metric);
                  const toneStyles = getToneStyles(tone);

                  return (
                    <tr
                      key={row.key}
                      className={cn(
                        'group transition-colors',
                        row.visualIndex % 2 === 0
                          ? 'bg-white dark:bg-zinc-950'
                          : 'bg-zinc-50/70 dark:bg-zinc-900/60'
                      )}
                    >
                      <td
                        className={cn(
                          'border-l-4 border-transparent px-6 py-4 font-semibold transition-colors group-hover:border-[#7C93B7]',
                          row.isNested ? 'pl-10' : ''
                        )}
                        style={{ color: MAIN }}
                      >
                        <span className="text-zinc-900 dark:text-white">{row.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">
                        {formatMetricValue(metric.previousValue, metric.unit)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-zinc-900 dark:text-white">
                        {formatMetricValue(metric.currentValue, metric.unit)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <TrendSparkline metric={metric} />
                        </div>
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 text-right font-semibold',
                          toneStyles.changeClassName
                        )}
                      >
                        {formatChangeValue(metric)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
