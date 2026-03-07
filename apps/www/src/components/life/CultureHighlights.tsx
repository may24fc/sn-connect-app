'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface CultureHighlightsProps {
  values: { title: string; description: string }[];
}

const ICONS = ['✦', '◆', '▲', '●', '★', '◈'];

export function CultureHighlights({ values }: CultureHighlightsProps): ReactNode {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {values.map((value, i) => (
        <ScrollReveal key={value.title} delay={i * 0.1}>
          <div className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-all hover:shadow-mega hover:border-indigo-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-lg font-bold">
              {ICONS[i % ICONS.length]}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">{value.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{value.description}</p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
