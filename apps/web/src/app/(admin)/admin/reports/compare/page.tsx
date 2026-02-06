'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  WeekDropdownSelector,
  WeekComparisonTable,
  InsightsSummary,
  type WeekPeriod,
  type WeekComparison,
  getCurrentWeekPeriod,
} from '@hr-portal/ui';

// Mock data - replace with actual API calls
const getMockComparison = (currentWeek: WeekPeriod, previousWeek: WeekPeriod): WeekComparison => {
  return {
    currentWeek,
    previousWeek,
    metrics: [
      {
        name: 'Total Expenditure',
        category: 'Expenditure',
        currentValue: 142000,
        previousValue: 125000,
        change: 17000,
        changePercent: 13.6,
        trend: 'up',
      },
      {
        name: 'Total Results',
        category: 'Revenue',
        currentValue: 340000,
        previousValue: 288000,
        change: 52000,
        changePercent: 18.1,
        trend: 'up',
      },
      {
        name: 'ROI',
        category: 'Performance',
        currentValue: 239,
        previousValue: 230,
        change: 9,
        changePercent: 3.9,
        trend: 'up',
      },
      {
        name: 'Submissions',
        category: 'Operations',
        currentValue: 18,
        previousValue: 22,
        change: -4,
        changePercent: -18.2,
        trend: 'down',
      },
      {
        name: 'Facebook Ads',
        category: 'Expenditure',
        currentValue: 52000,
        previousValue: 45000,
        change: 7000,
        changePercent: 15.6,
        trend: 'up',
      },
      {
        name: 'Google Ads',
        category: 'Expenditure',
        currentValue: 42000,
        previousValue: 38000,
        change: 4000,
        changePercent: 10.5,
        trend: 'up',
      },
      {
        name: 'Leads Generated',
        category: 'Results',
        currentValue: 245,
        previousValue: 180,
        change: 65,
        changePercent: 36.1,
        trend: 'up',
      },
      {
        name: 'Revenue',
        category: 'Revenue',
        currentValue: 340000,
        previousValue: 288000,
        change: 52000,
        changePercent: 18.1,
        trend: 'up',
      },
      {
        name: 'New Followers',
        category: 'Marketing',
        currentValue: 1200,
        previousValue: 850,
        change: 350,
        changePercent: 41.2,
        trend: 'up',
      },
    ],
  };
};

export default function ComparePage(): React.ReactNode {
  const router = useRouter();
  const currentWeekInit = getCurrentWeekPeriod();

  const getPreviousWeek = (week: WeekPeriod): WeekPeriod => {
    const prevStart = new Date(week.startDate);
    prevStart.setDate(prevStart.getDate() - 7);

    const prevEnd = new Date(week.endDate);
    prevEnd.setDate(prevEnd.getDate() - 7);

    return {
      weekNumber: week.weekNumber - 1,
      year: week.year,
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      label: `Week ${week.weekNumber - 1}, ${week.year}`,
    };
  };

  const [currentWeek, setCurrentWeek] = React.useState<WeekPeriod>(currentWeekInit);
  const [previousWeek, setPreviousWeek] = React.useState<WeekPeriod>(
    getPreviousWeek(currentWeekInit)
  );

  const comparison = getMockComparison(currentWeek, previousWeek);

  const handleCurrentWeekChange = (week: WeekPeriod): void => {
    setCurrentWeek(week);
    setPreviousWeek(getPreviousWeek(week));
  };

  const handleBack = (): void => {
    router.push('/admin/reports');
  };

  const handleExport = (): void => {
    // TODO: Implement export functionality
    console.log('Exporting comparison data');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to tracking</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-headline">Week-over-Week Comparison</h1>
          <p className="text-muted-foreground">
            Compare metrics between consecutive weeks
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Week Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Select Weeks to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Previous Week</label>
              <WeekDropdownSelector
                selectedWeek={previousWeek}
                onWeekChange={(week) => {
                  setPreviousWeek(week);
                }}
                weeksToShow={12}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Week</label>
              <WeekDropdownSelector
                selectedWeek={currentWeek}
                onWeekChange={handleCurrentWeekChange}
                weeksToShow={12}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Summary */}
      <InsightsSummary
        title="Week-over-Week Analysis"
        summary="Strong growth across most metrics with notable improvements in lead generation and revenue. Submission rate declined but remains acceptable."
        keyFindings={[
          {
            metric: 'Lead Generation',
            insight: 'Leads increased by 36.1% (65 additional leads), driven by improved Facebook ad targeting',
            highlight: true,
          },
          {
            metric: 'Revenue Growth',
            insight: 'Revenue grew 18.1% (PHP 52k increase) while spend only increased 13.6%',
            highlight: true,
          },
          {
            metric: 'Submission Rate',
            insight: 'Submissions dropped from 22 to 18, investigate with team leads',
            highlight: true,
          },
          {
            metric: 'Social Media',
            insight: 'New followers surged by 41.2%, indicating strong brand awareness campaign',
          },
        ]}
        recommendations={[
          'Follow up with the 4 team members who didn\'t submit reports this week',
          'Increase Facebook Ads budget given the 36% improvement in lead generation',
          'Analyze what changed in social media strategy to replicate the follower growth',
        ]}
      />

      {/* Comparison Table */}
      <WeekComparisonTable comparison={comparison} />
    </div>
  );
}
