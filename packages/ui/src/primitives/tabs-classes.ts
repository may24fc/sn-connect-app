// Plain module (no 'use client') so Server Components can style link-based tabs.
// Class names are written out in full so Tailwind's source scanner can find them.

/** Pill container shared by TabsList, ToggleGroup and link-based tab navs; h-10 matches Button, Input and Select. */
export const tabsListClassName =
  'inline-flex h-10 max-w-full items-center overflow-x-auto rounded-lg border border-border bg-muted/60 p-1 text-muted-foreground';

/**
 * Pill item shared by TabsTrigger (data-state=active), link tabs (aria-current=page)
 * and ToggleGroup buttons (aria-pressed=true).
 */
export const tabsTriggerClassName = [
  'inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium ring-offset-background transition-[background-color,color,box-shadow] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  'data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-sm',
  'aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-primary aria-[current=page]:shadow-sm',
  'aria-[pressed=true]:bg-card aria-[pressed=true]:font-semibold aria-[pressed=true]:text-primary aria-[pressed=true]:shadow-sm',
].join(' ');
