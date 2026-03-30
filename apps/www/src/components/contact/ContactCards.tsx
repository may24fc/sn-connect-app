'use client';

import type { ReactNode } from 'react';
import { Mail, Phone } from 'lucide-react';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

export function ContactCards(): ReactNode {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {BUSINESS_UNITS.map((unit, i) => {
        return (
          <ScrollReveal key={unit.slug} delay={i * 0.1}>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card">
              <h3 className="font-semibold text-zinc-900">{unit.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary-800">{unit.tagline}</p>
              <div className="mt-2 space-y-2 text-sm text-zinc-600">
                <a
                  href={`mailto:${unit.contact.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary-800"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {unit.contact.email}
                </a>
                <a
                  href={`tel:${unit.contact.phone}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary-800"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {unit.contact.phone}
                </a>
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
