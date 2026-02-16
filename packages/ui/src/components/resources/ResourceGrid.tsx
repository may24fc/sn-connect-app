import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface ResourceGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnClasses: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function ResourceGrid({
  children,
  columns = 3,
  className,
}: ResourceGridProps): React.ReactNode {
  return <div className={cn('grid gap-4', columnClasses[columns], className)}>{children}</div>;
}
