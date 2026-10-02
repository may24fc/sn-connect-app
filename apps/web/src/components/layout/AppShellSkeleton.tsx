'use client';

import { Skeleton } from '@hr-portal/ui';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', width: 'w-28' },
  { id: 'primary-work', width: 'w-36' },
  { id: 'tasks', width: 'w-24' },
  { id: 'reports', width: 'w-32' },
  { id: 'resources', width: 'w-28' },
  { id: 'settings', width: 'w-36' },
] as const;

const STAT_CARD_IDS = ['overview', 'progress', 'pending', 'activity'] as const;
const ACTIVITY_ROW_IDS = ['recent-1', 'recent-2', 'recent-3', 'recent-4'] as const;

export function AppShellSkeleton(): ReactNode {
  return (
    <output
      className="flex h-dvh w-full bg-background"
      aria-label="Preparing your dashboard"
      aria-busy="true"
    >
      <aside
        className="hidden h-dvh w-64 flex-shrink-0 flex-col border-r border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar-bg))] p-4 lg:flex"
        aria-hidden="true"
      >
        <div className="flex h-12 items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 bg-white/10 dark:bg-white/10" />
          <Skeleton className="h-5 w-32 bg-white/10 dark:bg-white/10" />
        </div>

        <div className="mt-8 space-y-3">
          {NAV_ITEMS.map(({ id, width }) => (
            <div className="flex h-10 items-center gap-3 px-2" key={id}>
              <Skeleton className="h-5 w-5 flex-shrink-0 bg-white/10 dark:bg-white/10" />
              <Skeleton className={`h-4 ${width} bg-white/10 dark:bg-white/10`} />
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <Skeleton className="h-9 w-9 rounded-full bg-white/10 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28 bg-white/10 dark:bg-white/10" />
            <Skeleton className="h-3 w-20 bg-white/10 dark:bg-white/10" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <Skeleton className="h-9 w-9 lg:hidden" />
          <div className="hidden items-center gap-3 lg:flex">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="ml-1 h-9 w-9 rounded-full" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 max-w-[70%]" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {STAT_CARD_IDS.map((id) => (
                <div className="rounded-xl border border-border bg-card p-5" key={id}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                  <Skeleton className="mt-5 h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-6 h-52 w-full rounded-lg" />
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32" />
                <div className="mt-6 space-y-4">
                  {ACTIVITY_ROW_IDS.map((id) => (
                    <div className="flex items-center gap-3" key={id}>
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <span className="sr-only">Preparing your dashboard...</span>
        </main>
      </div>
    </output>
  );
}
