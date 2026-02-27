'use client';

import { useReportsRealtime } from '@/hooks/useReportsRealtime';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

// Lazy-load the analytics tab (contains recharts / D3)
const ReportsAnalyticsTab = dynamic(
  () => import('./components/ReportsAnalyticsTab').then((m) => ({ default: m.ReportsAnalyticsTab })),
  {
    loading: () => (
      <div className="space-y-4 py-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    ),
    ssr: false,
  }
);
import { ReportsCompareTab } from './components/ReportsCompareTab';
import { ReportsSubmissionsTab } from './components/ReportsSubmissionsTab';

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'submissions';

  // Activate real-time subscription for the reports and report_metrics tables.
  // This ensures all three tabs (Submissions, Analytics, Compare) receive
  // live updates when employees submit reports or when metrics change.
  // The subscription is active for as long as this page is mounted.
  useReportsRealtime();

  const [department, setDepartment] = useState('marketing');
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-headline">Reports Management</h1>
          <p className="text-muted-foreground">Review submissions, analytics, and comparisons</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Department filter */}
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
            </SelectContent>
          </Select>

          {/* Time range selector */}
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as 'weekly' | 'monthly' | 'custom')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range inputs */}
          {timeRange === 'custom' && (
            <>
              <Input
                type="date"
                className="w-[160px]"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Start date"
              />
              <Input
                type="date"
                className="w-[160px]"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="End date"
              />
            </>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <ReportsSubmissionsTab
            department={department}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <ReportsAnalyticsTab
            department={department}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>

        <TabsContent value="compare">
          <ReportsCompareTab
            department={department}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
