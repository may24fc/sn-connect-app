'use client';

import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-white',
        secondary:
          'border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
        destructive: 'border-transparent bg-rose-600 text-white',
        success:
          'border-transparent bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
        warning:
          'border-transparent bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
        error: 'border-transparent bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
        outline: 'text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800',
        pending:
          'border-transparent bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
        approved:
          'border-transparent bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
        rejected:
          'border-transparent bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
        navy:
          'border-transparent bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.ReactNode {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
