import { Skeleton } from '@hr-portal/ui';
import type { ReactNode } from 'react';

/**
 * Shared skeleton for all profile pages (employee, admin, intern, super-admin).
 * Mirrors the profile layout: header card → personal info bento grid → role details.
 */
export function ProfilePageSkeleton(): ReactNode {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Avatar */}
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />

          {/* Name / position / badges */}
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information section header */}
      <div>
        <Skeleton className="h-6 w-48 mb-1" />
        <Skeleton className="h-4 w-72 mb-4" />

        {/* Bento Grid — 3 col on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Info */}
          <BentoCardSkeleton rows={3} />

          {/* Contact */}
          <BentoCardSkeleton rows={4} />

          {/* Education */}
          <BentoCardSkeleton rows={2} />

          {/* Address (span 2) */}
          <div className="lg:col-span-2">
            <BentoCardSkeleton rows={1} />
          </div>

          {/* Emergency Contact */}
          <BentoCardSkeleton rows={3} />
        </div>
      </div>

      {/* Role Details section */}
      <div>
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single bento card skeleton matching the profile info card shape. */
function BentoCardSkeleton({ rows }: { rows: number }): ReactNode {
  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4"
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Field rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`field-${i.toString()}`} className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-0.5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
