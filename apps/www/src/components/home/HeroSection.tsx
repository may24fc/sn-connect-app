'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { WHATS_NEW } from '@/data/placeholder';
import { CTAButton } from '@/components/shared/CTAButton';
import { AnimatedHeadline } from '@/components/shared/AnimatedHeadline';
import { SocialProofStrip } from '@/components/home/SocialProofStrip';
import { shineHoverClass } from '@/components/ui/shine-hover';

export function HeroSection(): ReactNode {
  return (
    <section className="relative overflow-x-clip bg-white pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24">
     

      <div className="section-max section-padding relative">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
            Building <AnimatedHeadline />,{' '}
            <span className="text-amber-600">Empowering Lives</span>
          </h1>
          <p className="mt-4 text-base text-zinc-500">
            A diversified conglomerate committed to excellence across food
            service, healthcare, fitness, and construction.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <CTAButton href="/businesses" variant="primary" size="lg" className={shineHoverClass}>
              Explore Our Businesses
            </CTAButton>
            <CTAButton href="/careers" variant="outline" size="lg">
              View Careers
            </CTAButton>
          </div>
        </div>
      </div>

      {/* Social Proof Strip — dark variant */}
      <SocialProofStrip />
    </section>
  );
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function WhatsNewMarquee(): ReactNode {
  const items = [...WHATS_NEW, ...WHATS_NEW];

  return (
    <section className="relative flex items-center border-y border-zinc-100 bg-white py-3">
      {/* Pinned "What's New" label */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-white pl-5 pr-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          What&apos;s New
        </span>
        <div className="h-4 w-px bg-zinc-200" aria-hidden="true" />
      </div>

      {/* Scrolling ticker */}
      <div className="group relative flex-1 overflow-hidden">
        {/* Left edge fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-white to-transparent"
          aria-hidden="true"
        />
        {/* Right edge fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-white to-transparent"
          aria-hidden="true"
        />

        <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          {items.map((item, i) => (
            <Link
              key={`${item.text}-${i}`}
              href={item.href}
              className="inline-flex items-center gap-2 transition-colors hover:text-zinc-900"
            >
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: item.categoryColor }}
              >
                {item.category}
              </span>
              <span className="text-sm text-zinc-600">
                {item.text}
              </span>
              <span className="text-xs text-zinc-400">
                {formatDaysAgo(item.daysAgo)}
              </span>
              <span className="mx-5 select-none text-zinc-300" aria-hidden="true">
                ·
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
