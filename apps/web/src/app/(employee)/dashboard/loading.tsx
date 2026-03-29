import { Skeleton } from '@hr-portal/ui';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Employee Dashboard.
 * Mirrors the StatCardGrid plus the remaining BentoGrid panels.
 */
export default function DashboardLoading(): ReactNode {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Stat cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 space-y-3"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Onboarding Progress (full width) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-lg p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Company Pulse (span 2) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>

        {/* Announcements (span 2) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 py-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
