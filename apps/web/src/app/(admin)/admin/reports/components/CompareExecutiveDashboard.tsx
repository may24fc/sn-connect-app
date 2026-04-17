'use client';

import { cn, type MetricComparison, type WeekComparison } from '@hr-portal/ui';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import * as React from 'react';

export interface CompareCampaignSummaryItem {
  key: string;
  campaignName: string;
  campaignTypeLabel: string;
  objectiveLabel: string;
  primaryChannel: string;
  targetAudience: string;
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

function getDisplayMetricName(name: string): string {
  return name === 'Total Reports' ? 'Total Submissions' : name;
}

function getFallbackMetric(
  name: 'Total Reports' | 'Link Clicks' | 'CTR' | 'Total Spend'
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
            ? 'USD'
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
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (normalizedUnit === 'usd') {
    return `$${value.toLocaleString('en-US', {
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
  metricName: 'Total Reports' | 'Link Clicks' | 'CTR' | 'Total Spend'
): MetricComparison {
  return (
    metrics.find((metric) => normalizeMetricName(metric.name) === normalizeMetricName(metricName)) ??
    getFallbackMetric(metricName)
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

function ComparisonPair({
  previousLabel,
  previousValue,
  currentLabel,
  currentValue,
}: {
  previousLabel: string;
  previousValue: string;
  currentLabel: string;
  currentValue: string;
}): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[24px] border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_12px_28px_rgba(2,6,23,0.2)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
          {previousLabel}
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {previousValue}
        </p>
      </div>
      <div className="rounded-[24px] border border-[#CBD8EE] bg-[#EEF4FF] p-5 shadow-sm dark:border-[#466288] dark:bg-[#172235] dark:shadow-[0_16px_34px_rgba(2,6,23,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5D7399] dark:text-[#AFC2E5]">
          {currentLabel}
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-[#1E293B] dark:text-white">
          {currentValue}
        </p>
      </div>
    </div>
  );
}

function SpendComparison({ metrics }: { metrics: MetricComparison[] }): React.ReactElement {
  const totalSpend = findMetric(metrics, 'Total Spend');

  return (
    <ComparisonPair
      previousLabel="Previous Spend"
      previousValue={formatMetricValue(totalSpend.previousValue, totalSpend.unit)}
      currentLabel="Current Spend"
      currentValue={formatMetricValue(totalSpend.currentValue, totalSpend.unit)}
    />
  );
}

function CampaignSummaryCard({
  campaign,
}: {
  campaign: CompareCampaignSummaryItem;
}): React.ReactElement {
  const comparisonToneClasses = campaign.appearsInOppositePeriod
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20'
    : 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20';

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-[0_12px_28px_rgba(2,6,23,0.2)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
              {campaign.campaignName}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Audience: {campaign.targetAudience}
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              Spend
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {formatMetricValue(campaign.totalSpend, 'USD')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {campaign.campaignTypeLabel}
          </span>
          <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[#5D7399] dark:bg-[#1B2940] dark:text-[#AFC2E5]">
            {campaign.objectiveLabel}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {campaign.primaryChannel}
          </span>
          <span className={cn('rounded-full px-2.5 py-1 ring-1 ring-inset', comparisonToneClasses)}>
            {campaign.comparisonLabel}
          </span>
          {campaign.reportCount > 1 ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              {campaign.reportCount} reports
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-zinc-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden dark:text-zinc-300">
          {campaign.summary}
        </p>
      </div>
    </div>
  );
}

function CampaignSummaryColumn({
  title,
  dateRange,
  campaigns,
  emptyMessage,
}: {
  title: string;
  dateRange: string;
  campaigns: CompareCampaignSummaryItem[];
  emptyMessage: string;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const visibleCampaigns = isExpanded ? campaigns : campaigns.slice(0, 3);
  const hiddenCount = Math.max(campaigns.length - 3, 0);

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_16px_34px_rgba(2,6,23,0.28)]">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5D7399] dark:text-[#AFC2E5]">
            {title}
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{dateRange}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {campaigns.length} campaigns
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">No campaigns for this period</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {visibleCampaigns.map((campaign) => (
            <CampaignSummaryCard key={campaign.key} campaign={campaign} />
          ))}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#7C93B7] hover:text-[#1E293B] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-[#466288] dark:hover:text-white"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isExpanded ? 'Show fewer campaigns' : `Show ${hiddenCount} more campaign${hiddenCount === 1 ? '' : 's'}`}
            </button>
          ) : null}
        </div>
      )}
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
  if (campaignSummaries.previous.length === 0 && campaignSummaries.current.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]">
      <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#7C93B7]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7C93B7]">
                Campaign Summary
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Narrative context for the campaigns included in each selected reporting period.
            </p>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Campaign cards follow the same campaign type and objective filters as the compare metrics.
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-6 xl:grid-cols-2">
        <CampaignSummaryColumn
          title="Previous Period"
          dateRange={formatReportDateRange(
            comparison.previousWeek.startDate,
            comparison.previousWeek.endDate
          )}
          campaigns={campaignSummaries.previous}
          emptyMessage="No reports matched the current compare filters for the previous period."
        />
        <CampaignSummaryColumn
          title="Current Period"
          dateRange={formatReportDateRange(
            comparison.currentWeek.startDate,
            comparison.currentWeek.endDate
          )}
          campaigns={campaignSummaries.current}
          emptyMessage="No reports matched the current compare filters for the current period."
        />
      </div>
    </div>
  );
}

function PeriodHeader({ comparison }: { comparison: WeekComparison }): React.ReactElement {
  return (
    <div className="rounded-[32px] border border-zinc-200 bg-gradient-to-br from-white via-slate-50 to-[#EEF4FF] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-gradient-to-br dark:from-[#1E293B] dark:via-[#273449] dark:to-[#334155] dark:shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
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
      <div className="mt-6">
        <ComparisonPair
          previousLabel="Previous Period"
          previousValue={formatReportDateRange(
            comparison.previousWeek.startDate,
            comparison.previousWeek.endDate
          )}
          currentLabel="Current Period"
          currentValue={formatReportDateRange(
            comparison.currentWeek.startDate,
            comparison.currentWeek.endDate
          )}
        />
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

export function CompareExecutiveDashboard({
  comparison,
  campaignSummaries,
  className,
}: CompareExecutiveDashboardProps): React.ReactNode {
  const metrics = comparison.metrics;
  const tableMetrics = getTableMetrics(comparison.metrics);

  return (
    <div className={cn('space-y-6', className)}>
      <PeriodHeader comparison={comparison} />

      <SpendComparison metrics={metrics} />

      {campaignSummaries ? (
        <CampaignSummarySection comparison={comparison} campaignSummaries={campaignSummaries} />
      ) : null}

      {/* <KPISection metrics={metrics} /> */}

      <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]">
        <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: ACCENT }}
          >
            Metric Breakdown
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Executive comparison of campaign performance across the selected reporting dates.
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
              {tableMetrics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No metrics to compare.
                  </td>
                </tr>
              ) : (
                tableMetrics.map((metric, index) => {
                  const tone = getChangeTone(metric);
                  const toneStyles = getToneStyles(tone);

                  return (
                    <tr
                      key={metric.name}
                      className={cn(
                        'group transition-colors',
                        index % 2 === 0
                          ? 'bg-white dark:bg-zinc-950'
                          : 'bg-zinc-50/70 dark:bg-zinc-900/60'
                      )}
                    >
                      <td
                        className="border-l-4 border-transparent px-6 py-4 font-semibold transition-colors group-hover:border-[#7C93B7]"
                        style={{ color: MAIN }}
                      >
                        <span className="text-zinc-900 dark:text-white">
                          {getDisplayMetricName(metric.name)}
                        </span>
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
                      <td className={cn('px-6 py-4 text-right font-semibold', toneStyles.changeClassName)}>
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