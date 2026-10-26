'use client';

import type * as React from 'react';
import { Button } from '../primitives/button';
import { tabsListClassName, tabsTriggerClassName } from '../primitives/tabs-classes';
import { cn } from '../utils/cn';

export interface ToggleGroupOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleGroupProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<ToggleGroupOption<T>>;
  /**
   * `segmented` (default) matches the TabsList look and is for switching views
   * (Cards / List, By week / By month). `choice` fills the selected option and is
   * for picking an answer inside a form (rating scales).
   */
  variant?: 'segmented' | 'choice';
  'aria-label'?: string;
  className?: string;
  buttonClassName?: string;
}

export function ToggleGroup<T extends string = string>({
  value,
  onChange,
  options,
  variant = 'segmented',
  'aria-label': ariaLabel,
  className,
  buttonClassName,
}: ToggleGroupProps<T>): React.ReactElement {
  if (variant === 'choice') {
    return (
      <fieldset
        aria-label={ariaLabel}
        className={cn(
          'inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950',
          className
        )}
      >
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-8', buttonClassName)}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </fieldset>
    );
  }

  return (
    <fieldset aria-label={ariaLabel} className={cn(tabsListClassName, className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(tabsTriggerClassName, buttonClassName)}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
