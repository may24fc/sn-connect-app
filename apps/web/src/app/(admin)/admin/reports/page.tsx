'use client';

import { useReports } from '@/hooks/useReports';
import { useReportsRealtime } from '@/hooks/useReportsRealtime';
import { getMarketingCampaignTypeAvailability } from '@/lib/marketing-report-config';
import {
  getMarketingObjectives,
  MARKETING_OBJECTIVE_INFO,
  MARKETING_REPORT_TYPE_OPTIONS,
  isMarketingWeeklyPlan,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
  type MarketingReportTypeFilterValue,
  getMarketingCampaignTypeOptionsForReportType,
  getMarketingObjectiveOptionsForReportType,
  resolveMarketingReportType,
} from '@/lib/report-utils';
import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DayPicker } from 'react-day-picker';
import { CalendarRange, X } from 'lucide-react';
import { ReportsPlansTab } from '@/app/(admin)/admin/reports/components/ReportsPlansTab';

const MARKETING_DEPARTMENT = 'marketing';
const FILTER_INCLUDED_STATUSES = ['submitted', 'approved'] as const;

function isFilterEligibleStatus(status: string): boolean {
  return FILTER_INCLUDED_STATUSES.includes(status as (typeof FILTER_INCLUDED_STATUSES)[number]);
}

// Lazy-load the analytics tab (contains recharts / D3)
const ReportsAnalyticsTab = dynamic(
  () =>
    import('./components/ReportsAnalyticsTab').then((m) => ({ default: m.ReportsAnalyticsTab })),
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

  const { data: filterReportsData } = useReports({
    department: MARKETING_DEPARTMENT,
    reportType: 'marketing',
    pageSize: 500,
  });

  const timeRange: 'weekly' | 'monthly' | 'custom' = 'weekly';
  const [reportType, setReportType] = useState<MarketingReportTypeFilterValue>('all');
  const [campaignType, setCampaignType] = useState<MarketingCampaignFilterValue>('all');
  const [objective, setObjective] = useState<MarketingObjectiveFilterValue>('all');
  const [periodRange, setPeriodRange] = useState<DateRange>();
  const customStartDate = periodRange?.from ? format(periodRange.from, 'yyyy-MM-dd') : '';
  const customEndDate = periodRange?.to ? format(periodRange.to, 'yyyy-MM-dd') : '';
  const planningFiltersEnabled =
    reportType === 'all' || getMarketingCampaignTypeAvailability(reportType) === 'enabled';
  const liveFilterReports = useMemo(
    () =>
      (filterReportsData?.data || []).filter(
        (report) => isFilterEligibleStatus(report.status) && !report.deleted_at && !isMarketingWeeklyPlan(report.marketing_context)
      ),
    [filterReportsData?.data]
  );
  const availableCampaignTypes = useMemo(() => {
    const configuredOptions = getMarketingCampaignTypeOptionsForReportType(
      reportType === 'all' ? undefined : reportType
    );

    if (!liveFilterReports.length) {
      return configuredOptions;
    }

    const submittedCampaignTypes = new Set(
      liveFilterReports
        .filter((report) => {
          const resolvedReportType = resolveMarketingReportType(report.marketing_context);

          return reportType === 'all' || resolvedReportType === reportType;
        })
        .map((report) => report.marketing_context?.campaignType)
        .filter((value): value is Exclude<MarketingCampaignFilterValue, 'all'> => Boolean(value))
    );

    return configuredOptions.filter((option) => submittedCampaignTypes.has(option.value));
  }, [liveFilterReports, reportType]);

  const availableObjectives = useMemo(() => {
    if (!planningFiltersEnabled) {
      return [];
    }

    const configuredObjectives = (
      getMarketingObjectiveOptionsForReportType(
        reportType === 'all' ? undefined : reportType,
        campaignType === 'all' ? undefined : campaignType
      ) as Array<MarketingObjectiveFilterValue>
    ).filter((value) => value !== 'all');

    if (!liveFilterReports.length) {
      return configuredObjectives;
    }

    const submittedObjectives = new Set(
      liveFilterReports
        .filter((report) => {
          const resolvedReportType = resolveMarketingReportType(report.marketing_context);

          if (reportType !== 'all' && resolvedReportType !== reportType) {
            return false;
          }

          if (campaignType !== 'all' && report.marketing_context?.campaignType !== campaignType) {
            return false;
          }

          return true;
        })
        .flatMap((report) => getMarketingObjectives(report.marketing_context))
        .filter((value): value is Exclude<MarketingObjectiveFilterValue, 'all'> => Boolean(value))
    );

    return configuredObjectives.filter((value) => submittedObjectives.has(value));
  }, [campaignType, liveFilterReports, planningFiltersEnabled, reportType]);

  useEffect(() => {
    if (!planningFiltersEnabled) {
      if (campaignType !== 'all') {
        setCampaignType('all');
      }

      if (objective !== 'all') {
        setObjective('all');
      }

      return;
    }

    if (
      campaignType !== 'all' &&
      !availableCampaignTypes.some((option) => option.value === campaignType)
    ) {
      setCampaignType('all');
      return;
    }

    if (objective !== 'all' && !availableObjectives.includes(objective)) {
      setObjective('all');
    }
  }, [
    availableCampaignTypes,
    availableObjectives,
    campaignType,
    objective,
    planningFiltersEnabled,
  ]);

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Reports</h1>
          <p className="text-muted-foreground">
            Review campaign submissions, model concurrent sales forecast scenarios, and compare
            reporting windows from one admin workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={reportType}
            onValueChange={(value) => setReportType(value as MarketingReportTypeFilterValue)}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Report Types</SelectItem>
              {MARKETING_REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={campaignType}
            onValueChange={(value) => setCampaignType(value as MarketingCampaignFilterValue)}
          >
            <SelectTrigger className="w-[190px]" disabled={!planningFiltersEnabled}>
              <SelectValue
                placeholder={planningFiltersEnabled ? 'Campaign Type' : 'Campaign Type not used'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Campaign Type</SelectItem>
              {availableCampaignTypes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={objective}
            onValueChange={(value) => setObjective(value as MarketingObjectiveFilterValue)}
          >
            <SelectTrigger className="w-[180px]" disabled={!planningFiltersEnabled}>
              <SelectValue placeholder={planningFiltersEnabled ? 'Goal' : 'Objective not used'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Goal</SelectItem>
              {availableObjectives.map((objectiveValue) => (
                <SelectItem key={objectiveValue} value={objectiveValue}>
                  {MARKETING_OBJECTIVE_INFO[objectiveValue].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-10 w-[330px] justify-between gap-2 px-3 text-left font-normal',
                  !periodRange?.from && 'text-muted-foreground'
                )}
              >
                <span className="flex min-w-0 flex-1 items-center">
                  <span className={cn('min-w-0 flex-1 truncate', !periodRange?.from && 'text-muted-foreground')}>
                    {periodRange?.from ? format(periodRange.from, 'MMM d, yyyy') : 'Start date'}
                  </span>
                  <span className="mx-3 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
                  <span className={cn('min-w-0 flex-1 truncate', !periodRange?.to && 'text-muted-foreground')}>
                    {periodRange?.to ? format(periodRange.to, 'MMM d, yyyy') : 'End date'}
                  </span>
                </span>
                <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <div className="space-y-3">
                <DayPicker
                  mode="range"
                  selected={periodRange}
                  onSelect={setPeriodRange}
                  className="mx-auto"
                  classNames={{
                    months: 'flex justify-center',
                    month: 'space-y-2',
                    caption: 'relative flex h-9 items-center justify-center',
                    caption_label: 'text-sm font-medium',
                    nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
                    button_previous: 'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted',
                    button_next: 'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted',
                    table: 'w-full border-collapse',
                    head_row: 'grid grid-cols-7 gap-1',
                    head_cell: 'h-8 text-center text-xs font-medium text-muted-foreground',
                    row: 'mt-1 grid grid-cols-7 gap-1',
                    cell: 'h-9 w-9 p-0 text-center text-sm',
                    day: 'h-9 w-9 p-0',
                    day_button: 'flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                    day_range_middle: 'rounded-none bg-muted',
                    day_range_start: 'rounded-r-none',
                    day_range_end: 'rounded-l-none',
                    day_today: 'font-bold',
                    day_outside: 'text-muted-foreground opacity-50',
                  }}
                />
                {periodRange?.from ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setPeriodRange(undefined)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear range
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          {/* Time range selector
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
          </Select> */}
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Sales Forecast</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <ReportsSubmissionsTab
            department={MARKETING_DEPARTMENT}
            reportType={reportType}
            campaignType={campaignType}
            objective={objective}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>

        <TabsContent value="plans">
          <ReportsPlansTab department={MARKETING_DEPARTMENT} />
        </TabsContent>

        <TabsContent value="analytics">
          <ReportsAnalyticsTab
            department={MARKETING_DEPARTMENT}
            reportType={reportType}
            campaignType={campaignType}
            objective={objective}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>

        <TabsContent value="compare">
          <ReportsCompareTab
            department={MARKETING_DEPARTMENT}
            reportType={reportType}
            campaignType={campaignType}
            objective={objective}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
