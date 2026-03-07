'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Service {
  title: string;
  description: string;
}

export function ServicesGrid({ services }: { services: Service[] }): ReactNode {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {services.map((service, i) => (
        <ScrollReveal key={service.title} delay={i * 0.1}>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg font-bold text-indigo-600">
              {i + 1}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-zinc-900">
              {service.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">{service.description}</p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
