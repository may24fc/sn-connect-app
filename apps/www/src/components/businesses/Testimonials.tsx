'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }): ReactNode {
  if (testimonials.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {testimonials.map((t, i) => (
        <ScrollReveal key={t.name} delay={i * 0.15}>
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="text-zinc-700 italic leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="font-semibold text-zinc-900">{t.name}</p>
              <p className="text-sm text-zinc-500">{t.role}</p>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
