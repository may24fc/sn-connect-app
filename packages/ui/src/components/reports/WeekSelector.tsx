'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../../primitives/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { cn } from '../../utils/cn';
import type { WeekPeriod } from './types';
import { getCurrentWeekPeriod, getWeekNumber, formatPeriodLabel } from './types';

interface WeekSelectorProps {
  selectedWeek: WeekPeriod;
  onWeekChange: (week: WeekPeriod) => void;
  className?: string;
  showNavigation?: boolean;
}

export function WeekSelector({
  selectedWeek,
  onWeekChange,
  className,
  showNavigation = true,
}: WeekSelectorProps): React.ReactNode {
  const handlePreviousWeek = (): void => {
    const prevStart = new Date(selectedWeek.startDate);
    prevStart.setDate(prevStart.getDate() - 7);

    const prevEnd = new Date(selectedWeek.endDate);
    prevEnd.setDate(prevEnd.getDate() - 7);

    const weekNumber = getWeekNumber(prevStart);
    const year = prevStart.getFullYear();

    onWeekChange({
      weekNumber,
      year,
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      label: `Week ${weekNumber}, ${year}`,
    });
  };

  const handleNextWeek = (): void => {
    const nextStart = new Date(selectedWeek.startDate);
    nextStart.setDate(nextStart.getDate() + 7);

    const nextEnd = new Date(selectedWeek.endDate);
    nextEnd.setDate(nextEnd.getDate() + 7);

    const weekNumber = getWeekNumber(nextStart);
    const year = nextStart.getFullYear();

    onWeekChange({
      weekNumber,
      year,
      startDate: nextStart.toISOString(),
      endDate: nextEnd.toISOString(),
      label: `Week ${weekNumber}, ${year}`,
    });
  };

  const handleCurrentWeek = (): void => {
    onWeekChange(getCurrentWeekPeriod());
  };

  const periodLabel = formatPeriodLabel(selectedWeek.startDate, selectedWeek.endDate);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showNavigation && (
        <>
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous week</span>
          </Button>

          <div className="flex flex-col items-center gap-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{selectedWeek.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">{periodLabel}</span>
          </div>

          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next week</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={handleCurrentWeek}>
            Today
          </Button>
        </>
      )}

      {!showNavigation && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{selectedWeek.label}</span>
          </div>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
        </div>
      )}
    </div>
  );
}

interface WeekDropdownSelectorProps {
  selectedWeek: WeekPeriod;
  onWeekChange: (week: WeekPeriod) => void;
  weeksToShow?: number;
  className?: string;
}

export function WeekDropdownSelector({
  selectedWeek,
  onWeekChange,
  weeksToShow = 12,
  className,
}: WeekDropdownSelectorProps): React.ReactNode {
  const weeks = React.useMemo(() => {
    const result: WeekPeriod[] = [];
    const current = getCurrentWeekPeriod();

    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = new Date(current.startDate);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const weekEnd = new Date(current.endDate);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekNumber = getWeekNumber(weekStart);
      const year = weekStart.getFullYear();

      result.push({
        weekNumber,
        year,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        label: `Week ${weekNumber}, ${year}`,
      });
    }

    return result;
  }, [weeksToShow]);

  return (
    <Select
      value={`${selectedWeek.weekNumber}-${selectedWeek.year}`}
      onValueChange={(value) => {
        const week = weeks.find((w) => `${w.weekNumber}-${w.year}` === value);
        if (week) {
          onWeekChange(week);
        }
      }}
    >
      <SelectTrigger className={cn('w-[280px]', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {weeks.map((week) => {
          const label = formatPeriodLabel(week.startDate, week.endDate);
          return (
            <SelectItem key={`${week.weekNumber}-${week.year}`} value={`${week.weekNumber}-${week.year}`}>
              {week.label} ({label})
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
