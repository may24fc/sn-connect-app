'use client';

import type * as React from 'react';
import { Button } from '../primitives/button';
import { cn } from '../utils/cn';

export interface ToggleGroupOption {
  value: string;
  label: string;
}

export interface ToggleGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: ToggleGroupOption[];
  className?: string;
  buttonClassName?: string;
}

export function ToggleGroup({
  value,
  onChange,
  options,
  className,
  buttonClassName,
}: ToggleGroupProps): React.ReactElement {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          className={cn('h-8', buttonClassName)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}