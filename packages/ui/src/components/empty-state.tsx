'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../primitives/button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 p-3">
          <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </div>
      )}
      <h3 className="mb-2 text-sm font-medium tracking-tight">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
