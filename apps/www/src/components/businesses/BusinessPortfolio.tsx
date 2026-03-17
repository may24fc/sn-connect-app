'use client';

import { type ReactNode, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid, List, ArrowRight, ExternalLink } from 'lucide-react';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

export function BusinessPortfolio(): ReactNode {
  const units = BUSINESS_UNITS;
  const [view, setView] = useState<ViewMode>('list');

  return (
    <div>
      {/* View toggle */}
      <div className="mt-8 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setView('grid')}
          aria-label="Grid view"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            view === 'grid'
              ? 'bg-amber-50 text-amber-600'
              : 'text-zinc-400 hover:text-zinc-600'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          aria-label="List view"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            view === 'list'
              ? 'bg-amber-50 text-amber-600'
              : 'text-zinc-400 hover:text-zinc-600'
          )}
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Grid view */}
      {view === 'grid' ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {units.map((unit, i) => {
            return (
              <ScrollReveal key={unit.slug} delay={i * 0.1}>
                <Link
                  href={`/businesses/${unit.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card transition-all hover:shadow-mega hover:border-zinc-300"
                >
                  {/* Hero image */}
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={unit.image}
                      alt={unit.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors">
                      {unit.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      {unit.tagline}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500 line-clamp-2">
                      {unit.description}
                    </p>

                    {/* Stats */}
                    {unit.stats.length > 0 && (
                      <div className="mt-4 flex gap-4 border-t border-zinc-100 pt-4">
                        {unit.stats.map((stat) => (
                          <div key={stat.label}>
                            <p className="text-sm font-bold text-zinc-900">{stat.value}</p>
                            <p className="text-[11px] text-zinc-500">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-600 group-hover:gap-2 transition-all">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    {unit.website_url && (
                      <a
                        href={unit.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-amber-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visit Website
                      </a>
                    )}
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      ) : (
        /* List view (alternating layout) */
        <div className="mt-8 space-y-16">
          {units.map((unit, index) => {
            const Icon = unit.icon;
            const isEven = index % 2 === 0;

            return (
              <ScrollReveal key={unit.slug} direction={isEven ? 'left' : 'right'}>
                <div
                  className={cn(
                    'group flex flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-card transition-all hover:shadow-mega hover:border-zinc-300 lg:flex-row',
                    !isEven && 'lg:flex-row-reverse'
                  )}
                >
                  {/* Hero image */}
                  <div className="relative shrink-0 overflow-hidden rounded-xl lg:w-72 lg:h-56">
                    <Image
                      src={unit.image}
                      alt={unit.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 288px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    {/* Icon badge */}
                    <div
                      className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${unit.color}ee` }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-center">
                    <h3 className="text-2xl font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                      {unit.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-zinc-500">
                      {unit.tagline}
                    </p>
                    <p className="mt-3 text-zinc-600">{unit.description}</p>

                    {/* Stats */}
                    {unit.stats.length > 0 && (
                      <div className="mt-4 flex gap-6">
                        {unit.stats.map((stat) => (
                          <div key={stat.label} className="rounded-lg bg-zinc-50 px-3 py-2">
                            <p className="text-lg font-bold text-zinc-900">{stat.value}</p>
                            <p className="text-xs text-zinc-500">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {unit.services.slice(0, 3).map((s) => (
                        <span
                          key={s.title}
                          className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                        >
                          {s.title}
                        </span>
                      ))}
                      {unit.services.length > 3 && (
                        <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
                          +{unit.services.length - 3} more
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/businesses/${unit.slug}`}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors group-hover:gap-2"
                    >
                      Learn more <ArrowRight className="h-4 w-4" />
                    </Link>
                    {unit.website_url && (
                      <a
                        href={unit.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-amber-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
