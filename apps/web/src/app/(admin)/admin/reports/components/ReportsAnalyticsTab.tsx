'use client';

import {
  Button,
  ExpenditureVsResultsChart,
  InsightsSummary,
  MetricKPICard,
  MetricKPICardGrid,
  ROIByDepartmentChart,
  SpendByCategoryChart,
  WeeklyTrendsChart,
} from '@hr-portal/ui';
import { Download } from 'lucide-react';

// TODO: Replace with actual API calls filtered by department and time range
const WEEKLY_DATA: Array<{ week: string; expenditure: number; results: number }> = [];
const CATEGORY_DATA: Array<{ name: string; value: number; percentage: number }> = [];
const DEPARTMENT_ROI_DATA: Array<{
  department: string;
  roi: number;
  expenditure: number;
  results: number;
}> = [];
const TRENDS_DATA: Array<{ week: string; submissions: number; averageROI: number }> = [];

interface ReportsAnalyticsTabProps {
  department: string;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export function ReportsAnalyticsTab({
  department,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsAnalyticsTabProps) {
  const handleExport = (): void => {};

  // Calculate summary metrics
  const totalExpenditure = WEEKLY_DATA.reduce((sum, w) => sum + w.expenditure, 0);
  const totalResults = WEEKLY_DATA.reduce((sum, w) => sum + w.results, 0);
  const averageROI =
    totalExpenditure > 0 ? ((totalResults - totalExpenditure) / totalExpenditure) * 100 : 0;
  const totalReports = TRENDS_DATA.reduce((sum, t) => sum + t.submissions, 0);

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
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Spend"
          value={totalExpenditure > 0 ? `PHP ${(totalExpenditure / 1000).toFixed(0)}k` : '—'}
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="blue"
        />
        <MetricKPICard
          label="Total Results"
          value={totalResults > 0 ? `PHP ${(totalResults / 1000).toFixed(0)}k` : '—'}
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="green"
        />
        <MetricKPICard
          label="Average ROI"
          value={averageROI > 0 ? `${averageROI.toFixed(1)}%` : '—'}
          change={{ absolute: '—', percent: 0, trend: 'stable' }}
          color="green"
        />
        <MetricKPICard
          label="Total Reports"
          value={totalReports || '—'}
          change={{ absolute: `${totalReports}`, trend: 'stable' }}
          color="blue"
        />
      </MetricKPICardGrid>

      {/* Insights Summary */}
      <InsightsSummary
        title="Analytics Insights"
        summary="No analytics data available yet. Data will appear here once reports are submitted."
        keyFindings={[]}
        recommendations={[]}
      />

      {/* Main Chart */}
      <ExpenditureVsResultsChart data={WEEKLY_DATA} />

      {/* Secondary Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <SpendByCategoryChart data={CATEGORY_DATA} />
        <ROIByDepartmentChart data={DEPARTMENT_ROI_DATA} />
      </div>

      {/* Trends Chart */}
      <WeeklyTrendsChart data={TRENDS_DATA} />
    </div>
  );
}
