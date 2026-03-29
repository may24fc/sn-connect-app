'use client';

import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../utils/cn';

const countBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold tabular-nums leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral:
          'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
        contrast:
          'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
        accent:
          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
        info:
          'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
        success:
          'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
        warning:
          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
        danger: 'bg-rose-600 text-white',
        outline:
          'border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
      },
      size: {
        sm: 'h-4 min-w-4 px-1.5 text-[10px]',
        md: 'h-5 min-w-5 px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface CountBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof countBadgeVariants> {
  count?: number;
  max?: number;
}

function CountBadge({
  className,
  variant,
  size,
  count,
  max,
  children,
  ...props
}: CountBadgeProps): React.ReactNode {
  const content =
    typeof count === 'number' ? (typeof max === 'number' && count > max ? `${max}+` : count) : children;

  return (
    <span className={cn(countBadgeVariants({ variant, size }), className)} {...props}>
      {content}
    </span>
  );
}

export { CountBadge, countBadgeVariants };