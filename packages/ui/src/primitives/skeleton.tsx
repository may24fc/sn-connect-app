'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800',
          'before:absolute before:inset-0 before:-translate-x-full',
          'before:animate-[shimmer_2s_infinite]',
          'before:bg-gradient-to-r before:from-transparent before:via-zinc-200/50 dark:before:via-zinc-700/50 before:to-transparent',
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
