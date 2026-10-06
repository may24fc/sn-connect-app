'use client';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@hr-portal/ui';
import { CalendarDays, Search, X } from 'lucide-react';
import type { Ref } from 'react';

export const FILTER_ALL_VALUE = 'all';

/**
 * Compact toolbar filter: reads as its own name while unset, and as "Name: Value"
 * with a highlighted border once a value is chosen, so active filters are visible
 * without a label row above every control.
 *
 * Pass `allValue={null}` for a scope selector that always has a value (e.g. a quarter):
 * it then has no "Any" option and is never highlighted as an active filter.
 */
export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  allValue = FILTER_ALL_VALUE,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allValue?: string | null;
}) {
  const isScope = allValue === null;
  const selected = value === allValue ? null : options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={isScope ? label : `Filter by ${label.toLowerCase()}`}
        className={cn(
          'w-auto max-w-[240px] gap-1.5 whitespace-nowrap',
          selected && !isScope && 'border-primary/50 bg-primary-muted/30 font-medium'
        )}
      >
        <SelectValue>
          {selected ? (
            <>
              <span className="font-normal text-muted-foreground">{label}:</span> {selected.label}
            </>
          ) : (
            label
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isScope ? null : <SelectItem value={allValue}>Any {label.toLowerCase()}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Date (or month) input with its label inside the control, matching FilterSelect's height.
 * Set `isScope` when the input always holds a value (e.g. the reporting month) so it is
 * not highlighted as an active filter.
 */
export function FilterDateInput({
  label,
  value,
  onChange,
  type = 'date',
  isScope = false,
  inputRef,
  onInputClick,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'date' | 'month';
  isScope?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onInputClick?: () => void;
}) {
  return (
    <label
      className={cn(
        'flex h-9 cursor-text items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-sm shadow-sm transition-colors hover:border-primary/35 focus-within:border-primary/60',
        value && !isScope && 'border-primary/50 bg-primary-muted/30'
      )}
    >
      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="whitespace-nowrap text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type={type}
        aria-label={label}
        onClick={onInputClick}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-foreground tabular-nums outline-none"
      />
    </label>
  );
}

export function FilterSearchInput({
  value,
  onChange,
  placeholder,
  maxLength = 200,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        aria-label={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="pl-8"
        placeholder={placeholder}
      />
    </div>
  );
}

/** Renders nothing until at least one filter is active. */
export function ClearFiltersButton({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
      <X className="mr-1 h-3.5 w-3.5" aria-hidden />
      Clear {count === 1 ? 'filter' : `${count} filters`}
    </Button>
  );
}
