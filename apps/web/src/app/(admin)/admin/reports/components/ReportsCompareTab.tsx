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
import { Download } from 'lucide-react';
import { useState } from 'react';

// TODO: Replace with actual API calls
const getComparison = (currentWeek: WeekPeriod, previousWeek: WeekPeriod): WeekComparison => {
  return {
    currentWeek,
    previousWeek,
    metrics: [],
  };
};

interface ReportsCompareTabProps {
  department: string;
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export function ReportsCompareTab({
  department,
  timeRange: _timeRange,
  customStartDate: _customStartDate,
  customEndDate: _customEndDate,
}: ReportsCompareTabProps) {
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

  const [currentWeek, setCurrentWeek] = useState<WeekPeriod>(currentWeekInit);
  const [previousWeek, setPreviousWeek] = useState<WeekPeriod>(getPreviousWeek(currentWeekInit));

  const comparison = getComparison(currentWeek, previousWeek);

  const handleCurrentWeekChange = (week: WeekPeriod): void => {
    setCurrentWeek(week);
    setPreviousWeek(getPreviousWeek(week));
  };

  const handleExport = (): void => {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Comparing weeks for{' '}
          <span className="font-medium text-foreground">
            {department === 'all' ? 'All Departments' : department}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={handleExport}>
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
              <span className="text-sm font-medium">Previous Week</span>
              <WeekDropdownSelector
                selectedWeek={previousWeek}
                onWeekChange={(week) => {
                  setPreviousWeek(week);
                }}
                weeksToShow={12}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Current Week</span>
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
