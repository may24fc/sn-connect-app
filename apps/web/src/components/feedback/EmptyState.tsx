'use client';

import { cn } from '@/lib/utils';
import { Button } from '@hr-portal/ui';
import { FileQuestion } from 'lucide-react';
import type * as React from 'react';

interface EmptyStateProps {
  /** Icon to display (defaults to FileQuestion) - should use strokeWidth={1.5} */
  icon?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-5 w-5',
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'py-12',
    icon: 'h-5 w-5',
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-5 w-5',
    title: 'text-lg',
    description: 'text-base',
  },
} as const;

/**
 * EmptyState - A component for displaying empty/no-data states.
 * Follows the Titanium & Indigo design system.
 *
 * Icons follow strict iconography rules:
 * - strokeWidth={1.5} (fine/elegant)
 * - h-5 w-5 size
 * - text-zinc-400 color (recede, not pop)
 * - NO colored background containers
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps): React.ReactNode {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Icon - no background container, just the icon */}
      <div className="mb-4 text-zinc-500 dark:text-zinc-400">
        {icon ? (
          <span className={sizes.icon}>{icon}</span>
        ) : (
          <FileQuestion className={cn(sizes.icon)} strokeWidth={1.5} />
        )}
      </div>

      {/* Title */}
      <h3 className={cn('font-medium text-zinc-900 dark:text-zinc-100 mb-1', sizes.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-zinc-500 dark:text-zinc-400 max-w-sm mb-4', sizes.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button onClick={action.onClick} size={size === 'sm' ? 'sm' : 'default'}>
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EmptyStateCard - EmptyState wrapped in a card container.
 */
interface EmptyStateCardProps extends EmptyStateProps {
  /** Card-specific CSS classes */
  cardClassName?: string;
}

export function EmptyStateCard({ cardClassName, ...props }: EmptyStateCardProps): React.ReactNode {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg',
        cardClassName
      )}
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
    >
      <EmptyState {...props} />
    </div>
  );
}

/**
 * TableEmptyState - EmptyState designed for table contexts.
 */
interface TableEmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  icon?: React.ReactNode;
}

export function TableEmptyState({
  title = 'No data available',
  description = 'There are no items to display at this time.',
  action,
  icon,
}: TableEmptyStateProps): React.ReactNode {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      {/* Fake header row */}
      <div className="bg-zinc-50 dark:bg-zinc-900 h-10 border-b border-zinc-200 dark:border-zinc-800" />

      {/* Empty state content */}
      {action ? (
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
          size="sm"
          className="py-16"
        />
      ) : (
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          size="sm"
          className="py-16"
        />
      )}
    </div>
  );
}

export { EmptyState as default };
