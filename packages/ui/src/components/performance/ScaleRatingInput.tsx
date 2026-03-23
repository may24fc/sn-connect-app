'use client';

import type * as React from 'react';
import { cn } from '../../utils/cn';

interface ScaleRatingInputProps {
  value: number | null | undefined;
  onChange: (rating: number) => void;
  rubrics?: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
  disabled?: boolean;
  className?: string;
}

const RATING_COLORS = {
  1: { bg: 'bg-error/10', border: 'border-error', text: 'text-error', ring: 'ring-error/30' },
  2: {
    bg: 'bg-warning/10',
    border: 'border-warning',
    text: 'text-warning',
    ring: 'ring-warning/30',
  },
  3: {
    bg: 'bg-primary/10',
    border: 'border-primary',
    text: 'text-primary',
    ring: 'ring-primary/30',
  },
  4: {
    bg: 'bg-success/10',
    border: 'border-success',
    text: 'text-success',
    ring: 'ring-success/30',
  },
} as const;

export function ScaleRatingInput({
  value,
  onChange,
  rubrics,
  disabled = false,
  className,
}: ScaleRatingInputProps): React.ReactNode {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as const).map((rating) => {
          const isSelected = value === rating;
          const colors = RATING_COLORS[rating];

          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange(rating)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2',
                isSelected
                  ? [colors.bg, colors.border, colors.ring, 'ring-2 shadow-sm']
                  : 'border-border bg-card hover:border-muted-foreground/30',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span
                className={cn(
                  'text-xl font-bold',
                  isSelected ? colors.text : 'text-muted-foreground'
                )}
              >
                {rating}
              </span>
              {rubrics?.[rating] && (
                <span
                  className={cn(
                    'text-xs text-center leading-tight line-clamp-3',
                    isSelected ? colors.text : 'text-muted-foreground'
                  )}
                >
                  {rubrics[rating]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ScaleRatingDisplayProps {
  value: number | null | undefined;
  rubrics?: {
    1?: string | null | undefined;
    2?: string | null | undefined;
    3?: string | null | undefined;
    4?: string | null | undefined;
  };
  className?: string;
}

export function ScaleRatingDisplay({
  value,
  rubrics,
  className,
}: ScaleRatingDisplayProps): React.ReactNode {
  if (!value) {
    return (
      <span className={cn('text-sm text-muted-foreground italic', className)}>Not rated yet</span>
    );
  }

  const colors = RATING_COLORS[value as keyof typeof RATING_COLORS];
  const rubricText = rubrics?.[value as keyof typeof rubrics];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
          colors?.bg,
          colors?.text
        )}
      >
        {value}
      </span>
      <span className="text-sm font-medium">{value} / 4</span>
      {rubricText && <span className="text-xs text-muted-foreground">— {rubricText}</span>}
    </div>
  );
}
