'use client';

import {
  Button,
  Card,
  CardContent,
  ExpenditureVsResultsChart,
  InsightsSummary,
  MetricKPICard,
  MetricKPICardGrid,
  ROIByDepartmentChart,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SpendByCategoryChart,
  WeeklyTrendsChart,
} from '@hr-portal/ui';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

// TODO: Replace with actual API calls
const WEEKLY_DATA: Array<{ week: string; expenditure: number; results: number }> = [];

const CATEGORY_DATA: Array<{ name: string; value: number; percentage: number }> = [];

const DEPARTMENT_ROI_DATA: Array<{ department: string; roi: number; expenditure: number; results: number }> = [];

const TRENDS_DATA: Array<{ week: string; submissions: number; averageROI: number }> = [];

export default function AnalyticsPage(): React.ReactNode {
  const router = useRouter();
  const [period, setPeriod] = React.useState('last_4_weeks');
  const [department, setDepartment] = React.useState('all');

  const handleBack = (): void => {
    router.push('/admin/reports');
  };

  const handleExport = (): void => {};

  // Calculate summary metrics
  const totalExpenditure = WEEKLY_DATA.reduce((sum, w) => sum + w.expenditure, 0);
  const totalResults = WEEKLY_DATA.reduce((sum, w) => sum + w.results, 0);
  const averageROI = totalExpenditure > 0 ? ((totalResults - totalExpenditure) / totalExpenditure) * 100 : 0;
  const totalReports = TRENDS_DATA.reduce((sum, t) => sum + t.submissions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to tracking</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-headline">Reports Analytics</h1>
          <p className="text-muted-foreground">
            Visualize expenditure vs results with comprehensive charts
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Spend"
          value={totalExpenditure > 0 ? `PHP ${(totalExpenditure / 1000).toFixed(0)}k` : '—'}
          change={{
            absolute: '—',
            percent: 0,
            trend: 'stable',
          }}
          color="blue"
        />
        <MetricKPICard
          label="Total Results"
          value={totalResults > 0 ? `PHP ${(totalResults / 1000).toFixed(0)}k` : '—'}
          change={{
            absolute: '—',
            percent: 0,
            trend: 'stable',
          }}
          color="green"
        />
        <MetricKPICard
          label="Average ROI"
          value={averageROI > 0 ? `${averageROI.toFixed(1)}%` : '—'}
          change={{
            absolute: '—',
            percent: 0,
            trend: 'stable',
          }}
          color="green"
        />
        <MetricKPICard
          label="Total Reports"
          value={totalReports || '—'}
          change={{
            absolute: `${totalReports}`,
            trend: 'stable',
          }}
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
