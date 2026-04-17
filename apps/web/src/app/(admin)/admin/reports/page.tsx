'use client';

import { useReportsRealtime } from '@/hooks/useReportsRealtime';
import {
  getMarketingObjectivesForCampaignType,
  MARKETING_CAMPAIGN_TYPE_OPTIONS,
  MARKETING_OBJECTIVE_INFO,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
} from '@/lib/report-utils';
import {
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
import { useEffect, useMemo, useState } from 'react';

const MARKETING_DEPARTMENT = 'marketing';

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

  const timeRange: 'weekly' | 'monthly' | 'custom' = 'weekly';
  const customStartDate = '';
  const customEndDate = '';
  const [campaignType, setCampaignType] = useState<MarketingCampaignFilterValue>('all');
  const [objective, setObjective] = useState<MarketingObjectiveFilterValue>('all');

  const availableObjectives = useMemo(
    () =>
      campaignType === 'all'
        ? (Object.keys(MARKETING_OBJECTIVE_INFO) as MarketingObjectiveFilterValue[]).filter(
            (value) => value !== 'all'
          )
        : getMarketingObjectivesForCampaignType(campaignType),
    [campaignType]
  );

  useEffect(() => {
    if (objective !== 'all' && !availableObjectives.includes(objective)) {
      setObjective('all');
    }
  }, [availableObjectives, objective]);

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Reports</h1>
          <p className="text-muted-foreground">
            Review campaign submissions, model concurrent sales forecast scenarios, and compare reporting windows from one admin workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={campaignType} onValueChange={(value) => setCampaignType(value as MarketingCampaignFilterValue)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Campaign Type</SelectItem>
              {MARKETING_CAMPAIGN_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={objective} onValueChange={(value) => setObjective(value as MarketingObjectiveFilterValue)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Goal" />
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
        </TabsList>

        <TabsContent value="submissions">
          <ReportsSubmissionsTab
            department={MARKETING_DEPARTMENT}
            campaignType={campaignType}
            objective={objective}
            timeRange={timeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <ReportsAnalyticsTab
            department={MARKETING_DEPARTMENT}
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
