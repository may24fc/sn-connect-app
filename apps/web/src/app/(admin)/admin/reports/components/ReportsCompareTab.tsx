'use client';

import { type ReportRecord, useReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/csv';
import {
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveLabel,
  matchesMarketingReportFilters,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
} from '@/lib/report-utils';
import {
  Button,
  Card,
  CardContent,
  InsightsSummary,
  Skeleton,
  type WeekComparison,
  WeekComparisonTable,
  WeekDropdownSelector,
  type WeekPeriod,
  getCurrentWeekPeriod,
} from '@hr-portal/ui';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ReportsCompareTabProps {
  department: string;
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

function aggregateReportMetrics(reports: ReportRecord[]): Map<string, number> {
  const metricsMap = new Map<string, number>();
  metricsMap.set('Total Submissions', reports.length);
  metricsMap.set('Approved', reports.filter((r) => r.status === 'approved').length);
  metricsMap.set('Rejected', reports.filter((r) => r.status === 'rejected').length);
  metricsMap.set('Pending', reports.filter((r) => r.status === 'submitted').length);
  metricsMap.set(
    'Unique Campaigns',
    new Set(
      reports.map((report) => report.marketing_context?.campaignName).filter((campaignName): campaignName is string => Boolean(campaignName))
    ).size
  );

  for (const report of reports) {
    if (report.marketing_context?.campaignType) {
      const campaignTypeLabel = getMarketingCampaignTypeLabel(report.marketing_context.campaignType);
      metricsMap.set(
        `Campaign Type: ${campaignTypeLabel}`,
        (metricsMap.get(`Campaign Type: ${campaignTypeLabel}`) || 0) + 1
      );
    }

    if (report.marketing_context?.objective) {
      const objectiveLabel = getMarketingObjectiveLabel(report.marketing_context.objective);
      metricsMap.set(
        `Objective: ${objectiveLabel}`,
        (metricsMap.get(`Objective: ${objectiveLabel}`) || 0) + 1
      );
    }

    for (const metric of report.report_metrics || []) {
      const name = metric.metric_name || 'Unknown';
      metricsMap.set(name, (metricsMap.get(name) || 0) + (metric.metric_value || 0));
    }
  }
  return metricsMap;
}

export function ReportsCompareTab({
  department,
  campaignType,
  objective,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsCompareTabProps) {
  const periods = useMemo(
    () => getComparisonPeriods(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );

  const currentWeekInit = getCurrentWeekPeriod();
  const [currentWeek, setCurrentWeek] = useState<WeekPeriod>(currentWeekInit);
  const [previousWeek, setPreviousWeek] = useState<WeekPeriod>(() => {
    const prevStart = new Date(currentWeekInit.startDate);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(currentWeekInit.endDate);
    prevEnd.setDate(prevEnd.getDate() - 7);
    return {
      weekNumber: Math.max(1, currentWeekInit.weekNumber - 1),
      year: currentWeekInit.year,
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      label: `Week ${Math.max(1, currentWeekInit.weekNumber - 1)}, ${currentWeekInit.year}`,
    };
  });

  const actualPeriods = useMemo(() => {
    if (timeRange === 'weekly') {
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

  const isLoading = currentLoading || previousLoading;
  const error = currentError || previousError;
  const currentReports = useMemo(
    () =>
      (currentData?.data || []).filter((report) =>
        matchesMarketingReportFilters(report, { campaignType, objective })
      ),
    [campaignType, currentData?.data, objective]
  );
  const previousReports = useMemo(
    () =>
      (previousData?.data || []).filter((report) =>
        matchesMarketingReportFilters(report, { campaignType, objective })
      ),
    [campaignType, objective, previousData?.data]
  );

  const { comparison, insightsData } = useMemo(() => {
    const currentMetrics = aggregateReportMetrics(currentReports);
    const previousMetrics = aggregateReportMetrics(previousReports);

    const allMetricNames = new Set([...currentMetrics.keys(), ...previousMetrics.keys()]);
    const metrics = Array.from(allMetricNames).map((name) => {
      const current = currentMetrics.get(name) || 0;
      const previous = previousMetrics.get(name) || 0;
      const pctChange =
        previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
      return {
        name,
        category: 'Report Metrics',
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
      const currentCampaigns = currentMetrics.get('Unique Campaigns') || 0;
      const previousCampaigns = previousMetrics.get('Unique Campaigns') || 0;
      keyFindings.push({
        metric: 'Campaign Coverage',
        insight: `${currentCampaigns} active campaigns vs ${previousCampaigns} previously`,
      });
      const totalChange =
        previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      if (totalChange > 0)
        keyFindings.push({
          metric: 'Growth',
          insight: `Report submissions increased by ${totalChange.toFixed(1)}%`,
          highlight: true,
        });
      else if (totalChange < 0)
        keyFindings.push({
          metric: 'Decline',
          insight: `Report submissions decreased by ${Math.abs(totalChange).toFixed(1)}%`,
        });

      const currentApprovalRate =
        currentTotal > 0
          ? (currentReports.filter((r) => r.status === 'approved').length / currentTotal) * 100
          : 0;
      const prevApprovalRate =
        previousTotal > 0
          ? (previousReports.filter((r) => r.status === 'approved').length / previousTotal) * 100
          : 0;
      if (currentApprovalRate > prevApprovalRate)
        recommendations.push('Approval rate is improving. Keep up the quality!');
      else if (currentApprovalRate < prevApprovalRate)
        recommendations.push('Approval rate has decreased. Review submission quality.');

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
    const prevStart = new Date(week.startDate);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(week.endDate);
    prevEnd.setDate(prevEnd.getDate() - 7);
    setPreviousWeek({
      weekNumber: week.weekNumber - 1,
      year: week.year,
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      label: `Week ${week.weekNumber - 1}, ${week.year}`,
    });
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
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load comparison data.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Comparing marketing reporting windows for the <span className="font-medium text-foreground">Marketing team</span>
          {campaignType !== 'all' ? ` | ${getMarketingCampaignTypeLabel(campaignType)}` : ''}
          {objective !== 'all' ? ` | ${getMarketingObjectiveLabel(objective)}` : ''}
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
              <WeekDropdownSelector
                selectedWeek={previousWeek}
                onWeekChange={setPreviousWeek}
                weeksToShow={12}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Current Week</span>
              <WeekDropdownSelector
                selectedWeek={currentWeek}
                onWeekChange={handleCurrentWeekChange}
                weeksToShow={12}
              />
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

      <InsightsSummary
        title={`${timeRange === 'monthly' ? 'Month' : timeRange === 'custom' ? 'Period' : 'Week'}-over-${timeRange === 'monthly' ? 'Month' : timeRange === 'custom' ? 'Period' : 'Week'} Marketing Analysis`}
        summary={insightsData.summary}
        keyFindings={insightsData.keyFindings}
        recommendations={insightsData.recommendations}
      />

      <WeekComparisonTable comparison={comparison} />
    </div>
  );
}
