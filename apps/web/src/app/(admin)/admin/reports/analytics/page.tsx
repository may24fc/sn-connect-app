'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, TrendingUp } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ExpenditureVsResultsChart,
  SpendByCategoryChart,
  ROIByDepartmentChart,
  WeeklyTrendsChart,
} from '@hr-portal/ui';

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

  const handleExport = (): void => {
    // TODO: Implement export functionality
    console.log('Exporting analytics data');
  };

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
          <h1 className="text-3xl font-bold">Reports Analytics</h1>
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

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {(totalExpenditure / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {(totalResults / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              +18% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {averageROI.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              +6% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
            <p className="text-xs text-muted-foreground">100% submission rate</p>
          </CardContent>
        </Card>
      </div>

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
