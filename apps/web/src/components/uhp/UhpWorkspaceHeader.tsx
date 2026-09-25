import type { ReactNode } from 'react';

interface UhpWorkspaceHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function UhpWorkspaceHeader({ title, description, actions }: UhpWorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Ultimate Health Project
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}
