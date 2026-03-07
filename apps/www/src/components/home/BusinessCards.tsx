'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { BUSINESS_UNITS } from '@/data/placeholder';

export function BusinessCards(): ReactNode {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <SectionHeading
            title="Our Businesses"
            subtitle="Four dynamic ventures united by a commitment to excellence."
          />
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BUSINESS_UNITS.map((unit, index) => (
            <ScrollReveal key={unit.slug} delay={index * 0.1}>
              <Link
                href={`/businesses/${unit.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {/* Text content */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-zinc-900 group-hover:text-indigo-600">
                    {unit.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {unit.tagline}
                  </p>
                </div>

                {/* Image area */}
                <div className="mx-5 mb-5 overflow-hidden rounded-lg bg-zinc-100 aspect-[4/3]">
                  <div
                    className="flex h-full w-full items-end p-4"
                    style={{ backgroundColor: `${unit.color}10` }}
                  >
                    <span className="text-xs font-medium text-zinc-400">
                      {unit.name}
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
