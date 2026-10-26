'use client';

import type * as React from 'react';
import { cn } from '../utils/cn';
import { PageTitle } from './PageTitle';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  ...props
}: PageHeaderProps): React.ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <PageTitle eyebrow={eyebrow}>{title}</PageTitle>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
