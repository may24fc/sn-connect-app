'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Service {
  title: string;
  description: string;
  image?: string;
}

interface ServicesGridProps {
  services: Service[];
  businessName?: string;
  subtitle?: string;
}

export function ServicesGrid({
  services,
  businessName,
  subtitle,
}: ServicesGridProps): ReactNode {
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
      {/* Left — sticky heading */}
      <div className="lg:w-[340px] shrink-0">
        <div className="lg:sticky lg:top-28">
          <ScrollReveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Our Services
            </h2>
            {(subtitle || businessName) && (
              <p className="mt-3 text-lg text-zinc-500">
                {subtitle ?? `What ${businessName} offers`}
              </p>
            )}
          </ScrollReveal>
        </div>
      </div>

      {/* Right — scrollable cards */}
      <div className="flex-1 space-y-6">
        {services.map((service, i) => (
          <ScrollReveal key={service.title} delay={i * 0.1}>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
              {service.image && (
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-lg font-bold text-zinc-900">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {service.description}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
