'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface CultureHighlightsProps {
  values: { title: string; description: string }[];
}


export function CultureHighlights({ values }: CultureHighlightsProps): ReactNode {
  return (
    <div className="relative">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 -mx-4 -my-8 rounded-3xl bg-gradient-to-br from-amber-50/50 via-transparent to-slate-50/50" />
      <div
        className="absolute inset-0 -mx-4 -my-8 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {values.map((value, i) => {
          return (
            <ScrollReveal key={value.title} delay={i * 0.1}>
              <div className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-all duration-300 hover:shadow-mega hover:border-amber-200 hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-zinc-900 transition-colors group-hover:text-amber-600">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 transition-colors group-hover:text-zinc-700">
                  {value.description}
                </p>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
