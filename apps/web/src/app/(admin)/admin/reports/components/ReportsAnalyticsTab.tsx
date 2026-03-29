'use client';

import { useReports } from '@/hooks/useReports';
import { exportToCsv, formatDateForCsv } from '@/lib/csv';
import {
  getMarketingCampaignTypeLabel,
  getMarketingMetricAnalyticsCategory,
  getMarketingObjectiveLabel,
  matchesMarketingReportFilters,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
} from '@/lib/report-utils';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  ExpenditureVsResultsChart,
  InsightsSummary,
  MetricKPICard,
  MetricKPICardGrid,
  ROIByDepartmentChart,
  Skeleton,
  SpendByCategoryChart,
  WeeklyTrendsChart,
} from '@hr-portal/ui';
import { AlertCircle, Download } from 'lucide-react';
import { useMemo } from 'react';

interface ReportsAnalyticsTabProps {
  department: string;
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

function formatCurrency(value: number): string {
  return `PHP ${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `PHP ${(value / 1000).toFixed(0)}k`;
  }

  return formatCurrency(value);
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
    pageSize: 500, // Get more reports for analytics
  };

  const { data, isLoading, error } = useReports(filters);
  const reports = useMemo(
    () =>
      (data?.data || []).filter((report) =>
        matchesMarketingReportFilters(report, { campaignType, objective })
      ),
    [campaignType, data?.data, objective]
  );

  // Process reports data for charts
  const { chartData, kpiData, insightsData } = useMemo(() => {
    const uniqueCampaigns = new Set<string>();

    let totalSpend = 0;
    let totalOutcomes = 0;

    const weeklyMap = new Map<
      string,
      { spend: number; outcomes: number; count: number; campaigns: Set<string> }
    >();
    const categoryMap = new Map<string, number>();
    const channelCountMap = new Map<string, number>();
    const objectivePerformanceMap = new Map<string, { spend: number; outcomes: number }>();
    const objectiveCountMap = new Map<string, number>();
    const campaignTypeCountMap = new Map<string, number>();

    for (const report of reports) {
      const metrics = report.report_metrics || [];
      const reportSpend = metrics
        .filter(
          (metric) => getMarketingMetricAnalyticsCategory(metric.metric_name) === 'spend'
        )
        .reduce((sum, metric) => sum + (metric.metric_value || 0), 0);
      const reportOutcomes = metrics
        .filter(
          (metric) => getMarketingMetricAnalyticsCategory(metric.metric_name) === 'outcome'
        )
        .reduce((sum, metric) => sum + (metric.metric_value || 0), 0);
      const marketingContext = report.marketing_context;

      totalSpend += reportSpend;
      totalOutcomes += reportOutcomes;

      if (marketingContext?.campaignName) {
        uniqueCampaigns.add(marketingContext.campaignName);
      }

      if (marketingContext?.objective) {
        const objectiveLabel = getMarketingObjectiveLabel(marketingContext.objective);
        objectiveCountMap.set(objectiveLabel, (objectiveCountMap.get(objectiveLabel) || 0) + 1);
      }

      if (marketingContext?.campaignType) {
        const campaignTypeLabel = getMarketingCampaignTypeLabel(marketingContext.campaignType);
        campaignTypeCountMap.set(
          campaignTypeLabel,
          (campaignTypeCountMap.get(campaignTypeLabel) || 0) + 1
        );
      }

      if (marketingContext?.primaryChannel) {
        channelCountMap.set(
          marketingContext.primaryChannel,
          (channelCountMap.get(marketingContext.primaryChannel) || 0) + 1
        );
      }

      if (marketingContext?.primaryChannel && reportSpend > 0) {
        categoryMap.set(
          marketingContext.primaryChannel,
          (categoryMap.get(marketingContext.primaryChannel) || 0) + reportSpend
        );
      }

      if (marketingContext?.objective) {
        const objectiveLabel = getMarketingObjectiveLabel(marketingContext.objective);
        const objectiveData = objectivePerformanceMap.get(objectiveLabel) || {
          spend: 0,
          outcomes: 0,
        };
        objectiveData.spend += reportSpend;
        objectiveData.outcomes += reportOutcomes;
        objectivePerformanceMap.set(objectiveLabel, objectiveData);
      }

      if (report.period_start) {
        const weekStart = new Date(report.period_start);
        const weekKey = `Week ${Math.ceil(weekStart.getDate() / 7)}`;
        const weekData = weeklyMap.get(weekKey) || {
          spend: 0,
          outcomes: 0,
          count: 0,
          campaigns: new Set<string>(),
        };
        weekData.spend += reportSpend;
        weekData.outcomes += reportOutcomes;
        weekData.count += 1;
        if (marketingContext?.campaignName) {
          weekData.campaigns.add(marketingContext.campaignName);
        }
        weeklyMap.set(weekKey, weekData);
      }
    }

    const weeklyData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      spend: data.spend,
      outcomes: data.outcomes,
    }));

    const categoryTotal = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: categoryTotal > 0 ? (value / categoryTotal) * 100 : 0,
    }));

    const objectivePerformanceData = Array.from(objectivePerformanceMap.entries()).map(([label, data]) => ({
      label,
      spend: data.spend,
      outcomes: data.outcomes,
      costPerOutcome: data.outcomes > 0 ? data.spend / data.outcomes : 0,
    }));

    const trendsData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      submissions: data.count,
      activeCampaigns: data.campaigns.size,
    }));

    const costPerOutcome = totalOutcomes > 0 ? totalSpend / totalOutcomes : 0;
    const topObjective = Array.from(objectiveCountMap.entries()).sort((left, right) => right[1] - left[1])[0];
    const topCampaignType = Array.from(campaignTypeCountMap.entries()).sort((left, right) => right[1] - left[1])[0];
    const topSpendChannel = Array.from(categoryMap.entries()).sort((left, right) => right[1] - left[1])[0];
    const topActiveChannel = Array.from(channelCountMap.entries()).sort((left, right) => right[1] - left[1])[0];

    interface KeyFinding {
      metric: string;
      insight: string;
      highlight?: boolean;
    }
    const keyFindings: KeyFinding[] = [];
    const recommendations: string[] = [];

    if (reports.length > 0) {
      keyFindings.push({
        metric: 'Report Count',
        insight: `${reports.length} reports submitted in this period`,
      });
      keyFindings.push({
        metric: 'Active Campaigns',
        insight: `${uniqueCampaigns.size} campaign${uniqueCampaigns.size === 1 ? '' : 's'} tracked`,
      });
      if (totalSpend > 0) {
        keyFindings.push({
          metric: 'Total Spend',
          insight: formatCurrency(totalSpend),
        });
      }
      if (totalOutcomes > 0) {
        keyFindings.push({
          metric: 'Tracked Outcomes',
          insight: totalOutcomes.toLocaleString('en-PH'),
        });
      }
      if (costPerOutcome > 0) {
        keyFindings.push({
          metric: 'Cost per Outcome',
          insight: formatCurrency(costPerOutcome),
          highlight: totalSpend > 0 && totalOutcomes > 0,
        });
      }
      if (topCampaignType) {
        keyFindings.push({
          metric: 'Leading Campaign Type',
          insight: `${topCampaignType[0]} (${topCampaignType[1]} reports)`,
        });
      }
      if (topObjective) {
        keyFindings.push({
          metric: 'Primary Objective',
          insight: `${topObjective[0]} (${topObjective[1]} reports)`,
        });
      }
      if (topSpendChannel) {
        keyFindings.push({
          metric: 'Highest Spend Channel',
          insight: `${topSpendChannel[0]} at ${formatCurrency(topSpendChannel[1])}`,
        });
      } else if (topActiveChannel) {
        keyFindings.push({
          metric: 'Most Active Channel',
          insight: `${topActiveChannel[0]} (${topActiveChannel[1]} reports)`,
        });
      }

      if (totalOutcomes === 0) {
        recommendations.push('Outcome metrics have not been logged yet. Ask teams to fill in at least one primary outcome metric per report.');
      } else if (totalSpend > 0) {
        recommendations.push(`Average cost per tracked outcome is ${formatCurrency(costPerOutcome)}. Review by objective and primary channel to spot efficiency gaps.`);
      } else {
        recommendations.push('Reports are landing without tracked spend. If media spend applies, log the cost metrics so efficiency reporting stays complete.');
      }

      if (topCampaignType && topObjective) {
        recommendations.push(`Most submissions are concentrated in ${topCampaignType[0]} campaigns with a ${topObjective[0]} goal. Use the filters to compare whether other goals are under-reported.`);
      }

      if (topActiveChannel) {
        recommendations.push(`Primary channel activity is highest in ${topActiveChannel[0]}. Check whether spend and tracked outcomes still line up with that channel focus.`);
      }
    }

    return {
      chartData: { weeklyData, categoryData, objectivePerformanceData, trendsData },
      kpiData: {
        totalSpend,
        totalOutcomes,
        costPerOutcome,
        totalReports: reports.length,
        activeCampaigns: uniqueCampaigns.size,
      },
      insightsData: {
        summary:
          reports.length > 0
            ? `Analyzing ${reports.length} marketing reports across ${uniqueCampaigns.size || 0} campaigns from ${periodStart} to ${periodEnd}, grouped by awareness, consideration, and conversion goals.`
            : 'No marketing reports found for this period. Submit reports to see analytics.',
        keyFindings,
        recommendations,
      },
    };
  }, [periodStart, periodEnd, reports]);

  const handleExport = () => {
    if (reports.length === 0) return;

    exportToCsv(reports, {
      filename: `marketing-reports-analytics-${timeRange}`,
      headers: [
        'Marketing Team Member',
        'Campaign Name',
        'Campaign Type',
        'Objective',
        'Primary Channel',
        'Status',
        'Period Start',
        'Period End',
        'Notes',
      ],
      rowMapper: (report) => [
        report.employees ? `${report.employees.first_name} ${report.employees.last_name}` : '',
        report.marketing_context?.campaignName || '',
        report.marketing_context?.campaignType
          ? getMarketingCampaignTypeLabel(report.marketing_context.campaignType)
          : '',
        report.marketing_context?.objective
          ? getMarketingObjectiveLabel(report.marketing_context.objective)
          : '',
        report.marketing_context?.primaryChannel || '',
        report.status,
        formatDateForCsv(report.period_start),
        formatDateForCsv(report.period_end),
        report.notes || '',
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
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load analytics data"
            description="The analytics view could not be retrieved. Refresh and try again."
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing analytics for the <span className="font-medium text-foreground">Marketing team</span>{' '}
          {campaignType !== 'all' ? `| ${getMarketingCampaignTypeLabel(campaignType)} ` : ''}
          {objective !== 'all' ? `| ${getMarketingObjectiveLabel(objective)} ` : ''}
          ({timeRange}
          {timeRange === 'custom' && customStartDate && customEndDate
            ? `: ${customStartDate} to ${customEndDate}`
            : ''}
          )
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!reports.length}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Spend"
          value={
            kpiData.totalSpend > 0
              ? formatCompactCurrency(kpiData.totalSpend)
              : '—'
          }
          change={{ absolute: 'No prior data', trend: 'stable' }}
          color="blue"
        />
        <MetricKPICard
          label="Tracked Outcomes"
          value={
            kpiData.totalOutcomes > 0
              ? kpiData.totalOutcomes.toLocaleString('en-PH')
              : '—'
          }
          change={{ absolute: 'No prior data', trend: 'stable' }}
          color="green"
        />
        <MetricKPICard
          label="Cost per Outcome"
          value={kpiData.costPerOutcome > 0 ? formatCurrency(kpiData.costPerOutcome) : '—'}
          change={{ absolute: 'No prior data', trend: 'stable' }}
          color="orange"
        />
        <MetricKPICard
          label="Active Campaigns"
          value={kpiData.activeCampaigns || '—'}
          change={{ absolute: `${kpiData.totalReports} reports this period`, trend: 'stable' }}
          color="blue"
        />
      </MetricKPICardGrid>

      {/* Insights Summary */}
      <InsightsSummary
        title="Analytics Insights"
        summary={insightsData.summary}
        keyFindings={insightsData.keyFindings}
        recommendations={insightsData.recommendations}
      />

      {/* Main Chart */}
      <ExpenditureVsResultsChart data={chartData.weeklyData} />

      {/* Secondary Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <SpendByCategoryChart data={chartData.categoryData} />
        <ROIByDepartmentChart data={chartData.objectivePerformanceData} />
      </div>

      {/* Trends Chart */}
      <WeeklyTrendsChart data={chartData.trendsData} />
    </div>
  );
}
