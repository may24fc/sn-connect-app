'use client';

import { useReports } from '@/hooks/useReports';
import { exportToCsv, formatDateForCsv } from '@/lib/csv';
import {
  Button,
  Card,
  CardContent,
  ExpenditureVsResultsChart,
  InsightsSummary,
  MetricKPICard,
  MetricKPICardGrid,
  ROIByDepartmentChart,
  Skeleton,
  SpendByCategoryChart,
  WeeklyTrendsChart,
} from '@hr-portal/ui';
import { Download } from 'lucide-react';
import { useMemo } from 'react';

interface ReportsAnalyticsTabProps {
  department: string;
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
    periodStart,
    periodEnd,
    pageSize: 500, // Get more reports for analytics
  };

  const { data, isLoading, error } = useReports(filters);

  // Process reports data for charts
  const { chartData, kpiData, insightsData } = useMemo(() => {
    const reports = data?.data || [];

    // Aggregate metrics from report_metrics
    let totalExpenditure = 0;
    let totalResults = 0;

    // Group data by week for trends
    const weeklyMap = new Map<string, { expenditure: number; results: number; count: number }>();
    const categoryMap = new Map<string, number>();
    const deptMap = new Map<string, { expenditure: number; results: number }>();

    for (const report of reports) {
      const metrics = report.report_metrics || [];
      const dept = report.employees?.department || 'Unknown';

      // Process metrics
      for (const metric of metrics) {
        const name = metric.metric_name?.toLowerCase() || '';
        const value = metric.metric_value || 0;

        if (name.includes('spend') || name.includes('expenditure') || name.includes('cost')) {
          totalExpenditure += value;

          // Add to department ROI data
          const deptData = deptMap.get(dept) || { expenditure: 0, results: 0 };
          deptData.expenditure += value;
          deptMap.set(dept, deptData);
        } else if (name.includes('result') || name.includes('revenue') || name.includes('output')) {
          totalResults += value;

          const deptData = deptMap.get(dept) || { expenditure: 0, results: 0 };
          deptData.results += value;
          deptMap.set(dept, deptData);
        }

        // Track by category (metric name)
        const category = metric.metric_name || 'Other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + value);
      }

      // Weekly grouping based on period_start
      if (report.period_start) {
        const weekStart = new Date(report.period_start);
        const weekKey = `Week ${Math.ceil(weekStart.getDate() / 7)}`;
        const weekData = weeklyMap.get(weekKey) || { expenditure: 0, results: 0, count: 0 };
        weekData.count += 1;
        weeklyMap.set(weekKey, weekData);
      }
    }

    // Build charts data
    const weeklyData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      expenditure: data.expenditure,
      results: data.results,
    }));

    const categoryTotal = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: categoryTotal > 0 ? (value / categoryTotal) * 100 : 0,
    }));

    const departmentRoiData = Array.from(deptMap.entries()).map(([department, data]) => ({
      department,
      expenditure: data.expenditure,
      results: data.results,
      roi: data.expenditure > 0 ? ((data.results - data.expenditure) / data.expenditure) * 100 : 0,
    }));

    const trendsData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      submissions: data.count,
      averageROI:
        data.expenditure > 0 ? ((data.results - data.expenditure) / data.expenditure) * 100 : 0,
    }));

    const avgROI =
      totalExpenditure > 0 ? ((totalResults - totalExpenditure) / totalExpenditure) * 100 : 0;

    // Generate insights (KeyFinding type requires metric + insight)
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
      if (totalExpenditure > 0) {
        keyFindings.push({
          metric: 'Total Expenditure',
          insight: `PHP ${totalExpenditure.toLocaleString()}`,
        });
      }
      if (totalResults > 0) {
        keyFindings.push({
          metric: 'Total Results',
          insight: `PHP ${totalResults.toLocaleString()}`,
        });
      }
      if (avgROI !== 0) {
        keyFindings.push({
          metric: 'Average ROI',
          insight: `${avgROI.toFixed(1)}%`,
          highlight: avgROI > 10,
        });
      }

      if (avgROI < 0) {
        recommendations.push('ROI is negative. Review spending strategies.');
      } else if (avgROI < 10) {
        recommendations.push('ROI is below target. Consider optimizing campaigns.');
      } else {
        recommendations.push('Performance looks healthy. Continue current strategies.');
      }
    }

    return {
      chartData: { weeklyData, categoryData, departmentRoiData, trendsData },
      kpiData: {
        totalExpenditure,
        totalResults,
        averageROI: avgROI,
        totalReports: reports.length,
      },
      insightsData: {
        summary:
          reports.length > 0
            ? `Analyzing ${reports.length} reports from ${periodStart} to ${periodEnd}.`
            : 'No reports found for this period. Submit reports to see analytics.',
        keyFindings,
        recommendations,
      },
    };
  }, [data?.data, periodStart, periodEnd]);

  const handleExport = () => {
    const reports = data?.data || [];
    if (reports.length === 0) return;

    exportToCsv(reports, {
      filename: `reports-analytics-${timeRange}`,
      headers: [
        'Employee',
        'Department',
        'Report Type',
        'Status',
        'Period Start',
        'Period End',
        'Notes',
      ],
      rowMapper: (report) => [
        report.employees ? `${report.employees.first_name} ${report.employees.last_name}` : '',
        report.employees?.department || '',
        report.report_type,
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
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load analytics data. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing analytics for{' '}
          <span className="font-medium text-foreground">
            {department === 'all' ? 'All Departments' : department}
          </span>{' '}
          ({timeRange}
          {timeRange === 'custom' && customStartDate && customEndDate
            ? `: ${customStartDate} to ${customEndDate}`
            : ''}
          )
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.data?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Spend"
          value={
            kpiData.totalExpenditure > 0
              ? `PHP ${(kpiData.totalExpenditure / 1000).toFixed(0)}k`
              : '—'
          }
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="blue"
        />
        <MetricKPICard
          label="Total Results"
          value={
            kpiData.totalResults > 0 ? `PHP ${(kpiData.totalResults / 1000).toFixed(0)}k` : '—'
          }
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="green"
        />
        <MetricKPICard
          label="Average ROI"
          value={kpiData.averageROI !== 0 ? `${kpiData.averageROI.toFixed(1)}%` : '—'}
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="green"
        />
        <MetricKPICard
          label="Total Reports"
          value={kpiData.totalReports || '—'}
          change={{ absolute: `${kpiData.totalReports}`, trend: 'stable' }}
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
        <ROIByDepartmentChart data={chartData.departmentRoiData} />
      </div>

      {/* Trends Chart */}
      <WeeklyTrendsChart data={chartData.trendsData} />
    </div>
  );
}
