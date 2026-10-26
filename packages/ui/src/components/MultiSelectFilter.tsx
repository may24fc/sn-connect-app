'use client';

import { ChevronDown, X } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { cn } from '../utils/cn';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface MultiSelectFilterProps {
  /** Label displayed on the trigger button */
  label: string;
  /** Available options to choose from */
  options: Array<FilterOption>;
  /** Currently selected values */
  selected: Array<string>;
  /** Callback when selection changes */
  onSelectionChange: (selected: Array<string>) => void;
  /** Optional className for the trigger button */
  className?: string;
  /** Alignment of the dropdown */
  align?: 'start' | 'center' | 'end';
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onSelectionChange,
  className,
  align = 'start',
}: MultiSelectFilterProps): React.ReactNode {
  const handleToggle = (value: string): void => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  const hasSelection = selected.length > 0;
  const selectedSummary =
    selected.length === 1
      ? (options.find((option) => option.value === selected[0])?.label ?? '1 selected')
      : `${selected.length} selected`;

  // Matches FilterSelect: reads as its name while unset, "Name: Value" with a highlight once set.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            'flex h-10 w-auto max-w-[240px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background transition-all',
            'hover:border-primary/35 hover:bg-primary-muted/20',
            'focus:border-primary/60 focus:ring-2 focus:ring-ring/20 focus:ring-offset-0',
            hasSelection && 'border-primary/50 bg-primary-muted/30 font-medium',
            className
          )}
        >
          <span className="min-w-0 truncate">
            {hasSelection ? (
              <>
                <span className="font-normal text-muted-foreground">{label}:</span> {selectedSummary}
              </>
            ) : (
              label
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex-1">{option.label}</span>
            {option.count !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">{option.count}</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        {hasSelection && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => onSelectionChange([])}
              >
                Clear all
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Compact display of currently active filter selections */
export function ActiveFilterBadges({
  options,
  selected,
  onRemove,
}: {
  options: Array<FilterOption>;
  selected: Array<string>;
  onRemove: (value: string) => void;
}): React.ReactNode {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {selected.map((value) => {
        const option = options.find((o) => o.value === value);
        if (!option) return null;
        return (
          <Badge
            key={value}
            variant="secondary"
            className="h-6 gap-1 pl-2 pr-1 text-xs font-normal cursor-default"
          >
            {option.label}
            <button
              type="button"
              onClick={() => onRemove(value)}
              className="rounded-sm hover:bg-zinc-300 dark:hover:bg-zinc-600 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}
