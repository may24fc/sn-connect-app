import type { ReactNode } from 'react';
import { PageTitle } from '@hr-portal/ui';

interface UhpWorkspaceHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function UhpWorkspaceHeader({ title, description, actions }: UhpWorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <PageTitle>{title}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{description}</p>
      </div>
      {actions}
    </div>
  );
}
