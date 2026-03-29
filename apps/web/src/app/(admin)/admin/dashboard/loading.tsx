import { Skeleton } from '@hr-portal/ui';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Admin Dashboard.
 * Mirrors the StatCardGrid plus the remaining BentoGrid panels.
 */
export default function AdminDashboardLoading(): ReactNode {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Stat cards (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 space-y-3"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Company Pulse (span 2) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>

        {/* Recent Activity (span 2) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
