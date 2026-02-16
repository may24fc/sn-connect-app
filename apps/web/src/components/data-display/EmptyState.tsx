'use client';

import { Button } from '@hr-portal/ui';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" strokeWidth={1.5} />
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm">{description}</p>
      {action && (
        <>
          {action.href ? (
            <Link href={action.href}>
              <Button variant="outline" size="sm">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </>
      )}
      {children}
    </div>
  );
}
