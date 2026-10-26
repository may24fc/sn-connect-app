// Plain module (no 'use client') so Server Components can import these strings.

/** Background and divider for a table header row; shared by TableHeader and hand-built <thead> rows. */
export const tableHeaderClassName = 'border-b border-border bg-muted/55';

/** Header-cell typography; shared by TableHead and hand-built <th> cells. */
export const tableHeadTextClassName =
  'text-left text-[0.6875rem] font-semibold uppercase leading-4 tracking-[0.06em] text-muted-foreground lg:text-xs';
