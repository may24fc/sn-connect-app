'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

const PageContextLabel = React.createContext<string | null>(null);

/** Supplies the eyebrow label (the sidebar section or workspace of the current route). */
export function PageContextLabelProvider({
  label,
  children,
}: {
  label: string | null;
  children: React.ReactNode;
}): React.ReactNode {
  return <PageContextLabel.Provider value={label}>{children}</PageContextLabel.Provider>;
}

export const pageEyebrowClassName =
  'mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary';
export const pageTitleClassName = 'text-2xl font-bold tracking-tight text-foreground';

/** Small section label shown above every page title. Renders nothing outside the app shell. */
export function PageEyebrow({ children }: { children?: React.ReactNode }): React.ReactNode {
  const contextLabel = React.useContext(PageContextLabel);
  const label = children ?? contextLabel;
  return label ? <p className={pageEyebrowClassName}>{label}</p> : null;
}

export interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Overrides the section label from context; pass `false` when a PageEyebrow is
   * rendered separately (e.g. the title shares a row with an icon or badge).
   */
  eyebrow?: React.ReactNode | false;
}

/** The one page title: section eyebrow followed by the standard h1. */
export function PageTitle({
  eyebrow,
  className,
  children,
  ...props
}: PageTitleProps): React.ReactNode {
  return (
    <>
      {eyebrow === false ? null : <PageEyebrow>{eyebrow}</PageEyebrow>}
      <h1 className={cn(pageTitleClassName, className)} {...props}>
        {children}
      </h1>
    </>
  );
}
