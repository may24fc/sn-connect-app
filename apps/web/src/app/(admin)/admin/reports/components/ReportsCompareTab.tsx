'use client';

import { type ReportRecord, useReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/csv';
  import { supportsMarketingPlanningFilters } from '@/lib/marketing-report-config';
import {
  getContentCreationEntries,
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveLabel,
  getMarketingReportDisplayName,
  getMarketingReportTypeLabel,
  matchesMarketingReportFilters,
  parseNoteSections,
  resolveMarketingReportType,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
  type MarketingReportTypeFilterValue,
} from '@/lib/report-utils';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  // InsightsSummary,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  type WeekComparison,
  type WeekPeriod,
} from '@hr-portal/ui';
import { AlertCircle, CalendarRange, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CompareExecutiveDashboard,
  type CompareCampaignSummaries,
  type CompareCampaignSummaryItem,
} from './CompareExecutiveDashboard';

interface ReportsCompareTabProps {
  department: string;
  reportType: MarketingReportTypeFilterValue;
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
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
 * Get comparison periods based on timeRange
 */
function getComparisonPeriods(
  timeRange: 'weekly' | 'monthly' | 'custom',
  customStartDate?: string,
  customEndDate?: string
): {
  current: { start: string; end: string; label: string };
  previous: { start: string; end: string; label: string };
} {
  const now = new Date();

  if (timeRange === 'monthly') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return {
      current: {
        start: extractDateString(currentStart.toISOString()),
        end: extractDateString(currentEnd.toISOString()),
        label: `${monthNames[currentStart.getMonth()]} ${currentStart.getFullYear()}`,
      },
      previous: {
        start: extractDateString(prevStart.toISOString()),
        end: extractDateString(prevEnd.toISOString()),
        label: `${monthNames[prevStart.getMonth()]} ${prevStart.getFullYear()}`,
      },
    };
  }

  if (timeRange === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return {
      current: {
        start: customStartDate,
        end: customEndDate,
        label: `${customStartDate} to ${customEndDate}`,
      },
      previous: {
        start: extractDateString(prevStart.toISOString()),
        end: extractDateString(prevEnd.toISOString()),
        label: `${extractDateString(prevStart.toISOString())} to ${extractDateString(prevEnd.toISOString())}`,
      },
    };
  }

  // Default: weekly
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 6);
  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 6);

  return {
    current: {
      start: extractDateString(currentStart.toISOString()),
      end: extractDateString(currentEnd.toISOString()),
      label: 'This Week',
    },
    previous: {
      start: extractDateString(prevStart.toISOString()),
      end: extractDateString(prevEnd.toISOString()),
      label: 'Last Week',
    },
  };
}

function aggregateReportMetrics(
  reports: ReportRecord[]
): Map<string, { value: number; unit: string | null }> {
  const metricsMap = new Map<string, { value: number; unit: string | null }>();
  const uniqueCampaignLabels = new Set<string>();
  const uniqueContentApps = new Set<string>();
  const setMetric = (name: string, value: number, unit: string | null = null) => {
    metricsMap.set(name, { value, unit });
  };
  const incrementMetric = (name: string, value: number, unit: string | null = null) => {
    const existing = metricsMap.get(name);
    metricsMap.set(name, {
      value: (existing?.value || 0) + value,
      unit: existing?.unit ?? unit,
    });
  };

  setMetric('Total Reports', reports.length);
  setMetric(
    'Total Spend',
    reports.reduce((sum, report) => sum + (report.marketing_context?.totalSpend ?? 0), 0),
    'AUD'
  );

  for (const report of reports) {
    const reportType = resolveMarketingReportType(report.marketing_context);
    const reportLabel = getMarketingReportDisplayName(report.marketing_context);

    if (reportType === 'Content Creation') {
      const contentEntries = getContentCreationEntries(
        report.marketing_context,
        report.report_metrics
      );

      for (const entry of contentEntries) {
        uniqueContentApps.add(entry.platform);
        incrementMetric(`App: ${entry.platform}`, entry.posts, 'count');
      }
    } else if (reportLabel !== 'Untitled Marketing Report') {
      uniqueCampaignLabels.add(reportLabel);
    }

    if (report.marketing_context?.campaignType) {
      const campaignTypeLabel = getMarketingCampaignTypeLabel(report.marketing_context.campaignType);
      incrementMetric(
        `Campaign Type: ${campaignTypeLabel}`,
        1
      );
    }

    if (report.marketing_context?.objective) {
      const objectiveLabel = getMarketingObjectiveLabel(report.marketing_context.objective);
      incrementMetric(
        `Objective: ${objectiveLabel}`,
        1
      );
    }

    for (const metric of report.report_metrics || []) {
      const name = metric.metric_name || 'Unknown';
      incrementMetric(name, metric.metric_value || 0, metric.metric_unit || null);
    }
  }

  if (uniqueCampaignLabels.size > 0) {
    setMetric('Unique Campaigns', uniqueCampaignLabels.size);
  }

  if (uniqueContentApps.size > 0) {
    setMetric('Unique Apps', uniqueContentApps.size);
  }

  return metricsMap;
}

function formatReportDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${extractDateString(startDate)}T12:00:00.000Z`);
  const end = new Date(`${extractDateString(endDate)}T12:00:00.000Z`);
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

function dedupeReportsByWindow(reports: ReportRecord[]): ReportRecord[] {
  const dedupedReports = new Map<string, ReportRecord>();

  for (const report of reports) {
    const key = [
      report.employee_id,
      report.report_type,
      extractDateString(report.period_start),
      extractDateString(report.period_end),
    ].join('__');
    const existingReport = dedupedReports.get(key);

    if (!existingReport) {
      dedupedReports.set(key, report);
      continue;
    }

    const existingTimestamp = new Date(
      existingReport.reviewed_at ?? existingReport.submitted_at ?? existingReport.updated_at
    ).getTime();
    const nextTimestamp = new Date(
      report.reviewed_at ?? report.submitted_at ?? report.updated_at
    ).getTime();

    if (nextTimestamp >= existingTimestamp) {
      dedupedReports.set(key, report);
    }
  }

  return Array.from(dedupedReports.values());
}

const EMPTY_CAMPAIGN_SUMMARY = 'No campaign summary provided.';

type CampaignSummaryAccumulator = CompareCampaignSummaryItem & {
  primaryTimestamp: number;
  primarySpend: number;
  hasRealSummary: boolean;
};

function normalizeCampaignKeyPart(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function buildCampaignSummaryKey(marketingContext: NonNullable<ReportRecord['marketing_context']>): string {
  return [
    normalizeCampaignKeyPart(getMarketingReportDisplayName(marketingContext)),
    normalizeCampaignKeyPart(resolveMarketingReportType(marketingContext)),
    normalizeCampaignKeyPart(marketingContext.campaignType),
    normalizeCampaignKeyPart(marketingContext.objective),
  ].join('__');
}

function getReportSortTimestamp(
  report: Pick<ReportRecord, 'reviewed_at' | 'submitted_at' | 'updated_at' | 'created_at'>
): number {
  const timestamp = report.reviewed_at ?? report.submitted_at ?? report.updated_at ?? report.created_at;
  const value = new Date(timestamp).getTime();

  return Number.isFinite(value) ? value : 0;
}

function shouldPromoteCampaignPrimary(
  existing: CampaignSummaryAccumulator,
  nextTimestamp: number,
  nextSpend: number,
  nextHasRealSummary: boolean
): boolean {
  if (nextHasRealSummary !== existing.hasRealSummary) {
    return nextHasRealSummary;
  }

  if (nextTimestamp !== existing.primaryTimestamp) {
    return nextTimestamp > existing.primaryTimestamp;
  }

  return nextSpend > existing.primarySpend;
}

function buildCampaignSummaryItems(reports: ReportRecord[]): CompareCampaignSummaryItem[] {
  const groupedCampaigns = new Map<string, CampaignSummaryAccumulator>();

  for (const report of reports) {
    const marketingContext = report.marketing_context;
    const campaignName = marketingContext ? getMarketingReportDisplayName(marketingContext).trim() : '';

    if (!marketingContext || !campaignName || campaignName === 'Untitled Marketing Report') {
      continue;
    }

    const key = buildCampaignSummaryKey(marketingContext);
    const resolvedReportType = resolveMarketingReportType(marketingContext);
    const totalSpend = marketingContext.totalSpend ?? 0;
    const timestamp = getReportSortTimestamp(report);
    const summary = parseNoteSections(report.notes || '').summary.trim();
    const hasRealSummary = summary.length > 0;
    const existing = groupedCampaigns.get(key);

    if (!existing) {
      groupedCampaigns.set(key, {
        key,
        campaignName,
        reportTypeLabel: resolvedReportType
          ? getMarketingReportTypeLabel(resolvedReportType)
          : 'Marketing Report',
        campaignTypeLabel: marketingContext.campaignType
          ? getMarketingCampaignTypeLabel(marketingContext.campaignType)
          : null,
        objectiveLabel: marketingContext.objective
          ? getMarketingObjectiveLabel(marketingContext.objective)
          : null,
        totalSpend,
        summary: hasRealSummary ? summary : EMPTY_CAMPAIGN_SUMMARY,
        reportCount: 1,
        appearsInOppositePeriod: false,
        comparisonLabel: '',
        primaryTimestamp: timestamp,
        primarySpend: totalSpend,
        hasRealSummary,
      });
      continue;
    }

    existing.totalSpend += totalSpend;
    existing.reportCount += 1;

    if (shouldPromoteCampaignPrimary(existing, timestamp, totalSpend, hasRealSummary)) {
      existing.campaignName = campaignName;
      existing.reportTypeLabel = resolvedReportType
        ? getMarketingReportTypeLabel(resolvedReportType)
        : 'Marketing Report';
      existing.campaignTypeLabel = marketingContext.campaignType
        ? getMarketingCampaignTypeLabel(marketingContext.campaignType)
        : null;
      existing.objectiveLabel = marketingContext.objective
        ? getMarketingObjectiveLabel(marketingContext.objective)
        : null;
      existing.summary = hasRealSummary ? summary : EMPTY_CAMPAIGN_SUMMARY;
      existing.primaryTimestamp = timestamp;
      existing.primarySpend = totalSpend;
      existing.hasRealSummary = hasRealSummary;
    }
  }

  return Array.from(groupedCampaigns.values())
    .sort((left, right) => {
      if (right.totalSpend !== left.totalSpend) {
        return right.totalSpend - left.totalSpend;
      }

      return left.campaignName.localeCompare(right.campaignName, 'en-US', {
        sensitivity: 'base',
      });
    })
    .map(({ primaryTimestamp: _primaryTimestamp, primarySpend: _primarySpend, hasRealSummary: _hasRealSummary, ...item }) => item);
}

function buildWeekPeriodFromReport(report: Pick<ReportRecord, 'period_start' | 'period_end'>): WeekPeriod {
  const periodStart = extractDateString(report.period_start);
  const periodEnd = extractDateString(report.period_end);
  const startDate = new Date(`${periodStart}T00:00:00.000Z`);

  const firstThursday = new Date(startDate.valueOf());
  const dayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - dayNum + 3);
  const firstThursdayValue = firstThursday.valueOf();
  firstThursday.setUTCMonth(0, 1);
  if (firstThursday.getUTCDay() !== 4) {
    firstThursday.setUTCMonth(0, 1 + ((4 - firstThursday.getUTCDay() + 7) % 7));
  }

  const weekNumber =
    1 + Math.ceil((firstThursdayValue - firstThursday.valueOf()) / 604800000);
  const year = startDate.getUTCFullYear();
  const formattedRange = formatReportDateRangeLabel(periodStart, periodEnd);

  return {
    weekNumber,
    year,
    startDate: periodStart,
    endDate: periodEnd,
    label: formattedRange,
  };
}

function findNextComparableWeek(
  weeks: WeekPeriod[],
  selectedWeek: WeekPeriod | null
): WeekPeriod | null {
  if (weeks.length < 2) {
    return null;
  }

  if (!selectedWeek) {
    return weeks[1] ?? null;
  }

  const selectedIndex = weeks.findIndex(
    (week) =>
      week.startDate === selectedWeek.startDate &&
      week.endDate === selectedWeek.endDate
  );

  if (selectedIndex >= 0) {
    return (
      weeks[selectedIndex + 1] ??
      weeks.find(
        (week) =>
          week.startDate !== selectedWeek.startDate || week.endDate !== selectedWeek.endDate
      ) ??
      null
    );
  }

  return weeks[1] ?? weeks[0] ?? null;
}

function renderWeekValue(week: WeekPeriod | null): string {
  if (!week) {
    return '';
  }

  return `${week.startDate}__${week.endDate}`;
}

export function ReportsCompareTab({
  department,
  reportType,
  campaignType,
  objective,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsCompareTabProps) {
  const planningFiltersRelevant = reportType === 'all' || supportsMarketingPlanningFilters(reportType);
  const reportTypeSummaryLabel = reportType === 'all' ? 'All report types' : getMarketingReportTypeLabel(reportType);
  const periods = useMemo(
    () => getComparisonPeriods(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );

  const {
    data: allReportsData,
    isLoading: allReportsLoading,
    error: allReportsError,
  } = useReports({
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    pageSize: 500,
  });

  const comparableReports = useMemo(
    () =>
      dedupeReportsByWindow((allReportsData?.data || []).filter(
        (report) =>
          report.status !== 'draft' &&
          matchesMarketingReportFilters(report, { reportType, campaignType, objective })
      )),
    [allReportsData?.data, campaignType, objective, reportType]
  );

  const availableWeeks = useMemo(() => {
    const uniquePeriods = new Map<string, WeekPeriod>();

    for (const report of comparableReports) {
      const key = `${extractDateString(report.period_start)}__${extractDateString(report.period_end)}`;
      if (!uniquePeriods.has(key)) {
        uniquePeriods.set(key, buildWeekPeriodFromReport(report));
      }
    }

    return Array.from(uniquePeriods.values()).sort(
      (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
    );
  }, [comparableReports]);

  const [currentWeek, setCurrentWeek] = useState<WeekPeriod | null>(null);
  const [previousWeek, setPreviousWeek] = useState<WeekPeriod | null>(null);

  useEffect(() => {
    const nextCurrent = availableWeeks[0] ?? null;
    const currentStillAvailable =
      currentWeek &&
      availableWeeks.some(
        (week) => week.startDate === currentWeek.startDate && week.endDate === currentWeek.endDate
      )
        ? currentWeek
        : nextCurrent;
    const nextPrevious =
      previousWeek &&
      availableWeeks.some(
        (week) => week.startDate === previousWeek.startDate && week.endDate === previousWeek.endDate
      ) &&
      (!currentStillAvailable ||
        previousWeek.startDate !== currentStillAvailable.startDate ||
        previousWeek.endDate !== currentStillAvailable.endDate)
        ? previousWeek
        : findNextComparableWeek(availableWeeks, currentStillAvailable);

    if (
      (currentStillAvailable?.startDate ?? null) !== (currentWeek?.startDate ?? null) ||
      (currentStillAvailable?.endDate ?? null) !== (currentWeek?.endDate ?? null)
    ) {
      setCurrentWeek(currentStillAvailable);
    }

    if (
      (nextPrevious?.startDate ?? null) !== (previousWeek?.startDate ?? null) ||
      (nextPrevious?.endDate ?? null) !== (previousWeek?.endDate ?? null)
    ) {
      setPreviousWeek(nextPrevious);
    }
  }, [availableWeeks, currentWeek, previousWeek]);

  const actualPeriods = useMemo(() => {
    if (timeRange === 'weekly' && currentWeek && previousWeek) {
      return {
        current: {
          start: extractDateString(currentWeek.startDate),
          end: extractDateString(currentWeek.endDate),
          label: currentWeek.label,
        },
        previous: {
          start: extractDateString(previousWeek.startDate),
          end: extractDateString(previousWeek.endDate),
          label: previousWeek.label,
        },
      };
    }

    return periods;
  }, [timeRange, currentWeek, previousWeek, periods]);

  const {
    data: currentData,
    isLoading: currentLoading,
    error: currentError,
  } = useReports({
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    periodStart: actualPeriods.current.start,
    periodEnd: actualPeriods.current.end,
    pageSize: 500,
  });

  const {
    data: previousData,
    isLoading: previousLoading,
    error: previousError,
  } = useReports({
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    periodStart: actualPeriods.previous.start,
    periodEnd: actualPeriods.previous.end,
    pageSize: 500,
  });

  const isLoading = allReportsLoading || currentLoading || previousLoading;
  const error = allReportsError || currentError || previousError;
  const currentReports = useMemo(
    () =>
      dedupeReportsByWindow((currentData?.data || []).filter(
        (report) =>
          report.status !== 'draft' &&
          matchesMarketingReportFilters(report, { reportType, campaignType, objective })
      )),
    [campaignType, currentData?.data, objective, reportType]
  );
  const previousReports = useMemo(
    () =>
      dedupeReportsByWindow((previousData?.data || []).filter(
        (report) =>
          report.status !== 'draft' &&
          matchesMarketingReportFilters(report, { reportType, campaignType, objective })
      )),
    [campaignType, objective, previousData?.data, reportType]
  );

  const campaignSummaries = useMemo<CompareCampaignSummaries>(() => {
    const previousItems = buildCampaignSummaryItems(previousReports);
    const currentItems = buildCampaignSummaryItems(currentReports);
    const previousKeys = new Set(previousItems.map((item) => item.key));
    const currentKeys = new Set(currentItems.map((item) => item.key));

    return {
      previous: previousItems.map((item) => ({
        ...item,
        appearsInOppositePeriod: currentKeys.has(item.key),
        comparisonLabel: currentKeys.has(item.key)
          ? 'Also in current period'
          : 'Only in previous period',
      })),
      current: currentItems.map((item) => ({
        ...item,
        appearsInOppositePeriod: previousKeys.has(item.key),
        comparisonLabel: previousKeys.has(item.key)
          ? 'Also in previous period'
          : 'New this period',
      })),
    };
  }, [currentReports, previousReports]);

  const { comparison } = useMemo(() => {
    const currentMetrics = aggregateReportMetrics(currentReports);
    const previousMetrics = aggregateReportMetrics(previousReports);

    const allMetricNames = new Set([...currentMetrics.keys(), ...previousMetrics.keys()]);
    const metrics = Array.from(allMetricNames).map((name) => {
      const currentMetric = currentMetrics.get(name);
      const previousMetric = previousMetrics.get(name);
      const current = currentMetric?.value || 0;
      const previous = previousMetric?.value || 0;
      const pctChange =
        previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
      return {
        name,
        category: '',
        unit: currentMetric?.unit ?? previousMetric?.unit ?? null,
        currentValue: current,
        previousValue: previous,
        change: current - previous,
        changePercent: pctChange,
        trend: (pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'stable') as
          | 'up'
          | 'down'
          | 'stable',
      };
    });

    const comparisonData: WeekComparison = {
      currentWeek: {
        weekNumber: 0,
        year: new Date().getFullYear(),
        startDate: actualPeriods.current.start,
        endDate: actualPeriods.current.end,
        label: actualPeriods.current.label,
      },
      previousWeek: {
        weekNumber: 0,
        year: new Date().getFullYear(),
        startDate: actualPeriods.previous.start,
        endDate: actualPeriods.previous.end,
        label: actualPeriods.previous.label,
      },
      metrics,
    };

    // KeyFinding type requires metric + insight
    interface KeyFinding {
      metric: string;
      insight: string;
      highlight?: boolean;
    }
    const keyFindings: KeyFinding[] = [];
    const recommendations: string[] = [];
    const currentTotal = currentReports.length;
    const previousTotal = previousReports.length;

    if (currentTotal > 0 || previousTotal > 0) {
      keyFindings.push({
        metric: 'Report Count',
        insight: `${currentTotal} reports in current period vs ${previousTotal} in previous period`,
      });
      const currentCampaigns = currentMetrics.get('Unique Campaigns')?.value || 0;
      const previousCampaigns = previousMetrics.get('Unique Campaigns')?.value || 0;
      keyFindings.push({
        metric: 'Campaign Coverage',
        insight: `${currentCampaigns} active campaigns vs ${previousCampaigns} previously`,
      });
      const totalChange =
        previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      if (totalChange > 0)
        keyFindings.push({
          metric: 'Growth',
          insight: `Report volume increased by ${totalChange.toFixed(1)}%`,
          highlight: true,
        });
      else if (totalChange < 0)
        keyFindings.push({
          metric: 'Decline',
          insight: `Report volume decreased by ${Math.abs(totalChange).toFixed(1)}%`,
        });

      if (currentCampaigns < previousCampaigns) {
        recommendations.push('Fewer campaigns were reported in the current period. Check for missing submissions or campaign pauses.');
      }
    }

    return {
      comparison: comparisonData,
      insightsData: {
        summary:
          currentTotal > 0 || previousTotal > 0
            ? `Comparing ${actualPeriods.current.label} with ${actualPeriods.previous.label}`
            : 'No marketing reports found for comparison.',
        keyFindings,
        recommendations,
      },
    };
  }, [actualPeriods, currentReports, previousReports]);

  const handleCurrentWeekChange = (week: WeekPeriod): void => {
    setCurrentWeek(week);
    if (
      previousWeek &&
      previousWeek.startDate !== week.startDate &&
      previousWeek.endDate !== week.endDate
    ) {
      return;
    }

    setPreviousWeek(findNextComparableWeek(availableWeeks, week));
  };

  const handleExport = () => {
    if (comparison.metrics.length === 0) return;
    exportToCsv(comparison.metrics, {
      filename: `marketing-reports-comparison-${timeRange}`,
      headers: ['Metric', 'Previous Period', 'Current Period', 'Change', 'Change (%)'],
      rowMapper: (m) => [
        m.name,
        m.previousValue,
        m.currentValue,
        m.change,
        `${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}%`,
      ],
    });
  };

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  if (error)
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load comparison data"
            description="The comparison view could not be retrieved. Refresh and try again."
            size="sm"
          />
        </CardContent>
      </Card>
    );

  if (timeRange === 'weekly' && availableWeeks.length === 0)
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={CalendarRange}
            title="No submitted report weeks yet"
            description="Submitted or reviewed marketing reports will appear here once the team has at least one non-draft report for a reporting week."
            size="sm"
          />
        </CardContent>
      </Card>
    );

  if (timeRange === 'weekly' && (!currentWeek || !previousWeek))
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={CalendarRange}
            title="Choose two submitted weeks to compare"
            description="At least two submitted reporting weeks are needed before the compare view can show a week-over-week breakdown."
            size="sm"
          />
        </CardContent>
      </Card>
    );

  const previousWeekOptions =
    timeRange === 'weekly' && currentWeek
      ? availableWeeks.filter(
          (week) =>
            week.startDate !== currentWeek.startDate || week.endDate !== currentWeek.endDate
        )
      : availableWeeks;
  const currentWeekOptions =
    timeRange === 'weekly' && previousWeek
      ? availableWeeks.filter(
          (week) =>
            week.startDate !== previousWeek.startDate || week.endDate !== previousWeek.endDate
        )
      : availableWeeks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Comparing marketing reporting windows for the <span className="font-medium text-foreground">Marketing team</span>
          {` | ${reportTypeSummaryLabel}`}
          {planningFiltersRelevant && campaignType !== 'all' ? ` | ${getMarketingCampaignTypeLabel(campaignType)}` : ''}
          {planningFiltersRelevant && objective !== 'all' ? ` | ${getMarketingObjectiveLabel(objective)}` : ''}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={comparison.metrics.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {timeRange === 'weekly' && (
        <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Select Weeks to Compare</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Previous Week</span>
              <Select value={renderWeekValue(previousWeek)} onValueChange={(value) => {
                const selected = availableWeeks.find(
                  (week) => renderWeekValue(week) === value
                );
                if (selected) {
                  setPreviousWeek(selected);
                }
              }}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="No submitted weeks" />
                </SelectTrigger>
                <SelectContent>
                  {previousWeekOptions.map((week) => (
                    <SelectItem key={renderWeekValue(week)} value={renderWeekValue(week)}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Current Week</span>
              <Select value={renderWeekValue(currentWeek)} onValueChange={(value) => {
                const selected = availableWeeks.find(
                  (week) => renderWeekValue(week) === value
                );
                if (selected) {
                  handleCurrentWeekChange(selected);
                }
              }}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="No submitted weeks" />
                </SelectTrigger>
                <SelectContent>
                  {currentWeekOptions.map((week) => (
                    <SelectItem key={renderWeekValue(week)} value={renderWeekValue(week)}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {timeRange !== 'weekly' && (
        <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Previous Period: </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{actualPeriods.previous.label}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Current Period: </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{actualPeriods.current.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* <InsightsSummary
        title={`${timeRange === 'monthly' ? 'Month' : timeRange === 'custom' ? 'Period' : 'Week'}-over-${timeRange === 'monthly' ? 'Month' : timeRange === 'custom' ? 'Period' : 'Week'} Marketing Analysis`}
        summary={insightsData.summary}
        keyFindings={insightsData.keyFindings}
        recommendations={insightsData.recommendations}
      /> */}

      <CompareExecutiveDashboard comparison={comparison} campaignSummaries={campaignSummaries} />
    </div>
  );
}
