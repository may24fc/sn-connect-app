'use client';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';

export function MetricsPeriodSelect({
  id,
  label = 'Metrics period',
  value,
  onValueChange,
  options,
  className,
  icon,
  visuallyHiddenLabel = false,
}: {
  id: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
  icon?: ReactNode;
  visuallyHiddenLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className={visuallyHiddenLabel ? 'sr-only' : 'text-sm text-muted-foreground'}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={className}>
          {icon}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
