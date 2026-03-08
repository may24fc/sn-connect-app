import type { ReactNode } from 'react';

export default function Loading(): ReactNode {
  return (
    <div className="min-h-[70vh] animate-pulse bg-white">
      {/* Hero skeleton */}
      <div className="py-24">
        <div className="section-max section-padding text-center">
          <div className="mx-auto h-10 w-64 rounded-lg bg-zinc-100" />
          <div className="mx-auto mt-4 h-5 w-96 rounded-lg bg-zinc-100" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="section-max section-padding pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-xl border border-zinc-100 bg-zinc-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
