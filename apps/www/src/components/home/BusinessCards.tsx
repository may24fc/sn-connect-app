'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { BUSINESS_UNITS, type BusinessUnit } from '@/data/placeholder';

/** Fixed display order */
const DISPLAY_ORDER = [
  'executive-assistance',
  'marketing-support',
  'content-creation',
  'ai-operations',
];

const orderedUnits = DISPLAY_ORDER.map(
  (slug) => BUSINESS_UNITS.find((u) => u.slug === slug)!
).filter(Boolean);

function BusinessCard({ unit, index }: { unit: BusinessUnit; index: number }): ReactNode {
  const isEven = index % 2 === 0;

  return (
    <ScrollReveal delay={index * 0.1}>
      <Link
        href={`/contact?service=${unit.slug}`}
        className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
      >
        <div className={`flex flex-col lg:flex-row${isEven ? '' : '-reverse'}`}>
          {/* Content panel */}
          <div className="flex flex-col justify-center px-8 py-8 sm:px-10 sm:py-10 lg:w-[45%] lg:py-12">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-[2rem] lg:leading-[1.15]">
              {unit.name}
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {unit.description}
            </p>

            <p
              className="mt-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: unit.color }}
            >
              {unit.tagline}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              {unit.services.map((s) => s.title).join(', ')}
            </p>

            {/* Stats row */}
            {unit.stats.length > 0 && (
              <div className="mt-4 flex gap-6">
                {unit.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-lg font-bold text-zinc-900">{stat.value}</p>
                    <p className="text-xs text-zinc-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors group-hover:text-zinc-900">
              Request this service <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>

          {/* Right — image collage */}
          <div className="relative lg:w-[55%]">
            <div className="grid h-full grid-cols-2 grid-rows-2 gap-1.5 p-1.5 lg:p-2">
              {/* Main hero image — spans full first column */}
              <div className="relative col-span-1 row-span-2 min-h-[180px] overflow-hidden rounded-xl lg:min-h-[220px]">
                <Image
                  src={unit.image}
                  alt={unit.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 30vw"
                />
              </div>
              {/* Service images — two stacked in second column */}
              <div className="relative min-h-[88px] overflow-hidden rounded-xl lg:min-h-[108px]">
                <Image
                  src={unit.services[0]?.image ?? unit.image}
                  alt={unit.services[0]?.title ?? unit.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 15vw"
                />
              </div>
              <div className="relative min-h-[88px] overflow-hidden rounded-xl lg:min-h-[108px]">
                <Image
                  src={unit.services[1]?.image ?? unit.image}
                  alt={unit.services[1]?.title ?? unit.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 15vw"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </ScrollReveal>
  );
}

export function BusinessCards(): ReactNode {
  return (
    <section id="services" className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
            Service tracks built for modern teams
          </h2>
          <p className="mt-4 max-w-2xl text-xl leading-relaxed text-zinc-500 sm:text-2xl">
            Start with the function you need most. We shape support around the workflow, coverage window, and communication style your team already runs on.
          </p>
        </ScrollReveal>

        <div className="mt-14 flex flex-col gap-10">
          {orderedUnits.map((unit, i) => (
            <BusinessCard key={unit.slug} unit={unit} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
