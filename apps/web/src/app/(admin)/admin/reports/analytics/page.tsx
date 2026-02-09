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

// Mock data - replace with actual API calls
const WEEKLY_DATA = [
  { week: 'Week 1', expenditure: 125000, results: 288000 },
  { week: 'Week 2', expenditure: 138000, results: 310000 },
  { week: 'Week 3', expenditure: 142000, results: 340000 },
  { week: 'Week 4', expenditure: 156000, results: 365000 },
  { week: 'Week 5', expenditure: 148000, results: 352000 },
  { week: 'Week 6', expenditure: 165000, results: 395000 },
];

const CATEGORY_DATA = [
  { name: 'Marketing', value: 285000, percentage: 45 },
  { name: 'Sales', value: 190000, percentage: 30 },
  { name: 'Operations', value: 127000, percentage: 20 },
  { name: 'HR', value: 31750, percentage: 5 },
];

const DEPARTMENT_ROI_DATA = [
  { department: 'Marketing', roi: 280, expenditure: 285000, results: 798000 },
  { department: 'Sales', roi: 210, expenditure: 190000, results: 399000 },
  { department: 'Operations', roi: 180, expenditure: 127000, results: 228600 },
  { department: 'HR', roi: 150, expenditure: 31750, results: 47625 },
];

const TRENDS_DATA = [
  { week: 'Week 1', submissions: 22, averageROI: 230 },
  { week: 'Week 2', submissions: 23, averageROI: 225 },
  { week: 'Week 3', submissions: 24, averageROI: 239 },
  { week: 'Week 4', submissions: 21, averageROI: 234 },
  { week: 'Week 5', submissions: 23, averageROI: 238 },
  { week: 'Week 6', submissions: 24, averageROI: 239 },
];

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
  const averageROI = ((totalResults - totalExpenditure) / totalExpenditure) * 100;
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
          value={`PHP ${(totalExpenditure / 1000).toFixed(0)}k`}
          change={{
            absolute: '+PHP 72k',
            percent: 12,
            trend: 'up',
          }}
          color="blue"
        />
        <MetricKPICard
          label="Total Results"
          value={`PHP ${(totalResults / 1000).toFixed(0)}k`}
          change={{
            absolute: '+PHP 335k',
            percent: 18,
            trend: 'up',
          }}
          color="green"
        />
        <MetricKPICard
          label="Average ROI"
          value={`${averageROI.toFixed(1)}%`}
          change={{
            absolute: '+6%',
            percent: 6,
            trend: 'up',
          }}
          color="green"
        />
        <MetricKPICard
          label="Total Reports"
          value={totalReports}
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
        summary="Strong performance across all departments with ROI trending upward. Marketing continues to drive the highest returns, while Operations shows steady improvement."
        keyFindings={[
          {
            metric: 'Top Performer',
            insight: 'Marketing department achieved 280% ROI, exceeding target by 40%',
            highlight: true,
          },
          {
            metric: 'Growth Trend',
            insight:
              'Overall expenditure increased 12% while results grew 18%, indicating improved efficiency',
            highlight: true,
          },
          {
            metric: 'Submission Rate',
            insight: '100% report submission rate maintained for 6 consecutive weeks',
          },
        ]}
        recommendations={[
          'Increase marketing budget allocation given the 280% ROI performance',
          "Share Marketing team's best practices with Operations to improve their ROI",
          'Consider quarterly deep-dive analysis to identify long-term trends',
        ]}
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
