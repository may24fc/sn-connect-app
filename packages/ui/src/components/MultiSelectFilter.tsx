'use client';

import { ChevronDown, X } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
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

  const handleClearAll = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const hasSelection = selected.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 border-zinc-200 dark:border-zinc-800 text-sm font-normal gap-1.5',
            hasSelection &&
              'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30',
            className
          )}
        >
          <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
          {hasSelection ? (
            <span className="flex items-center gap-1">
              <Badge variant="default" className="h-5 px-1.5 text-xs font-medium rounded-sm">
                {selected.length}
              </Badge>
              <button
                type="button"
                onClick={handleClearAll}
                className="ml-0.5 rounded-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 p-0.5"
              >
                <X className="h-3 w-3 text-zinc-500" />
              </button>
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel className="text-xs font-medium text-zinc-500">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex-1">{option.label}</span>
            {option.count !== undefined && (
              <span className="ml-auto text-xs text-zinc-400">{option.count}</span>
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
