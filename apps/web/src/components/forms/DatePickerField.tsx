'use client';

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@hr-portal/ui';
import { format, getMonth, getYear, isValid, parseISO, setMonth, setYear } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function buildYearOptions(startYear: number, endYear: number): Array<string> {
  const years: Array<string> = [];
  for (let year = endYear; year >= startYear; year -= 1) years.push(String(year));
  return years;
}

type DatePickerFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  emptyMonth?: string | undefined;
};

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = 'Select a date',
  disabled = false,
  fromYear = 1950,
  toYear = new Date().getFullYear(),
  minDate,
  maxDate,
  emptyMonth,
}: DatePickerFieldProps): ReactNode {
  const selectedDate = parseDateValue(value);
  const earliestDate = parseDateValue(minDate ?? '');
  const latestDate = parseDateValue(maxDate ?? '') ?? new Date();
  const selectedTime = selectedDate?.getTime();
  const emptyMonthDate = parseDateValue(emptyMonth ?? '') ?? new Date(toYear, 0, 1);
  const emptyMonthTime = emptyMonthDate.getTime();
  const [open, setOpen] = useState(false);
  const [month, setMonthState] = useState<Date>(selectedDate ?? emptyMonthDate);

  useEffect(() => {
    const nextMonth = selectedTime ? new Date(selectedTime) : new Date(emptyMonthTime);
    setMonthState((currentMonth) =>
      currentMonth.getTime() === nextMonth.getTime() ? currentMonth : nextMonth
    );
  }, [emptyMonthTime, selectedTime]);

  const yearOptions = useMemo(() => buildYearOptions(fromYear, toYear), [fromYear, toYear]);

  const handleSelect = (nextDate: Date | undefined): void => {
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(format(nextDate, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between rounded-md px-3 text-left font-normal',
            !selectedDate && 'text-muted-foreground'
          )}
          aria-label={
            selectedDate ? `Selected date ${format(selectedDate, 'MMMM d, yyyy')}` : placeholder
          }
        >
          <span className="truncate">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] rounded-2xl p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select
              value={String(getMonth(month))}
              onValueChange={(monthIndex) =>
                setMonthState((currentMonth) => setMonth(currentMonth, Number(monthIndex)))
              }
            >
              <SelectTrigger className="h-9 flex-1 rounded-xl">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((monthLabel, index) => (
                  <SelectItem key={monthLabel} value={String(index)}>
                    {monthLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(getYear(month))}
              onValueChange={(yearValue) =>
                setMonthState((currentMonth) => setYear(currentMonth, Number(yearValue)))
              }
            >
              <SelectTrigger className="h-9 w-[8.5rem] rounded-xl">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonthState}
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={
                earliestDate
                  ? [{ before: earliestDate }, { after: latestDate }]
                  : { after: latestDate }
              }
              className="mx-auto"
              classNames={{
                months: 'flex justify-center',
                month: 'space-y-2',
                caption: 'hidden',
                table: 'w-full border-collapse',
                head_row: 'grid grid-cols-7 gap-1',
                head_cell:
                  'h-8 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400',
                row: 'mt-1 grid grid-cols-7 gap-1',
                cell: 'h-10 w-10 p-0 text-center text-sm',
                day: 'h-10 w-10 p-0',
                day_button: cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl p-0 text-sm font-medium text-zinc-700 transition-colors',
                  'hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/20',
                  'dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                ),
                day_selected:
                  'bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white',
                day_today:
                  'border border-slate-300 text-slate-900 dark:border-zinc-600 dark:text-zinc-50',
                day_outside: 'text-zinc-400 dark:text-zinc-600',
                day_disabled: 'text-zinc-300 opacity-50 dark:text-zinc-700',
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Use the month and year menus to jump quickly.
            </p>
            {selectedDate ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
