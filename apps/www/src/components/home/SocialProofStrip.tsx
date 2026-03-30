'use client';

import type { ReactNode } from 'react';

export function SocialProofStrip(): ReactNode {
  const proofItems = [
    { label: 'Shortlist turnaround', value: '48 hours' },
    { label: 'Service tracks', value: '4 core offers' },
    { label: 'Coverage', value: 'AU and US ready' },
    { label: 'Engagement model', value: 'Managed + flexible' },
  ];

  return (
    <div className="mt-12 grid gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
      {proofItems.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-zinc-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
