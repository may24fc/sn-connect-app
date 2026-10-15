'use client';

import { DatePickerField } from '@/components/forms/DatePickerField';
import { Button, Label, cn } from '@hr-portal/ui';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

export type DateRangeValue = { from: string; to: string };

type DateRangeFilterProps = {
  idPrefix: string;
  value: DateRangeValue;
  onApply: (value: DateRangeValue) => void;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  fromYear?: number;
  helperText?: string;
  applyLabel?: string;
  className?: string;
};

export function DateRangeFilter({
  idPrefix,
  value,
  onApply,
  disabled = false,
  minDate,
  maxDate,
  fromYear = 2020,
  helperText = 'Start and end dates are both included.',
  applyLabel = 'Apply date range',
  className,
}: DateRangeFilterProps): ReactNode {
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(value), [value]);

  const apply = (): void => {
    if (!(draft.from && draft.to)) {
      setError('Choose both a start date and an end date.');
      return;
    }
    if (draft.from > draft.to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setError(null);
    onApply({ ...draft });
  };

  const clear = (): void => {
    const emptyValue = { from: '', to: '' };
    setDraft(emptyValue);
    setError(null);
    onApply(emptyValue);
  };

  const hasDraft = Boolean(draft.from || draft.to);
  const isComplete = Boolean(draft.from && draft.to);
  const isUnchanged = draft.from === value.from && draft.to === value.to;

  return (
    <div className={cn('rounded-xl border border-border bg-muted/20 p-3', className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-from`}>Start date</Label>
          <DatePickerField
            id={`${idPrefix}-from`}
            value={draft.from}
            onChange={(from) => {
              setError(null);
              setDraft((current) => ({ ...current, from }));
            }}
            placeholder="Choose start date"
            disabled={disabled}
            fromYear={fromYear}
            minDate={minDate}
            maxDate={draft.to || maxDate}
            emptyMonth={maxDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-to`}>End date</Label>
          <DatePickerField
            id={`${idPrefix}-to`}
            value={draft.to}
            onChange={(to) => {
              setError(null);
              setDraft((current) => ({ ...current, to }));
            }}
            placeholder="Choose end date"
            disabled={disabled}
            fromYear={fromYear}
            minDate={draft.from || minDate}
            maxDate={maxDate}
            emptyMonth={maxDate}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
          <Button
            type="button"
            onClick={apply}
            disabled={disabled || !isComplete || isUnchanged}
            className="flex-1 lg:flex-none"
          >
            {applyLabel}
          </Button>
          {hasDraft ? (
            <Button type="button" variant="ghost" onClick={clear} disabled={disabled}>
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          ) : null}
        </div>
      </div>
      <p
        className={cn('mt-2 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
        role={error ? 'alert' : undefined}
      >
        {error ?? helperText}
      </p>
    </div>
  );
}
