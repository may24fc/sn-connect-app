'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  InsightsSummary,
  type WeekComparison,
  WeekComparisonTable,
  WeekDropdownSelector,
  type WeekPeriod,
  getCurrentWeekPeriod,
} from '@hr-portal/ui';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

// TODO: Replace with actual API calls
const getComparison = (currentWeek: WeekPeriod, previousWeek: WeekPeriod): WeekComparison => {
  return {
    currentWeek,
    previousWeek,
    metrics: [],
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

  const comparison = getComparison(currentWeek, previousWeek);

  const handleCurrentWeekChange = (week: WeekPeriod): void => {
    setCurrentWeek(week);
    setPreviousWeek(getPreviousWeek(week));
  };

  const handleBack = (): void => {
    router.push('/admin/reports');
  };

  const handleExport = (): void => {};

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
          <p className="text-muted-foreground">Compare metrics between consecutive weeks</p>
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
        summary="No comparison data available yet. Select weeks and load data to see insights."
        keyFindings={[]}
        recommendations={[]}
      />

      {/* Comparison Table */}
      <WeekComparisonTable comparison={comparison} />
    </div>
  );
}
