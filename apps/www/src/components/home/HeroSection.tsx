import type { ReactNode } from 'react';
import Link from 'next/link';
import { WHATS_NEW } from '@/data/placeholder';
import { CTAButton } from '@/components/shared/CTAButton';
import { MeshGradientHero } from '@/components/shared/MeshGradientHero';
import { AnimatedHeadline } from '@/components/shared/AnimatedHeadline';
import { SocialProofStrip } from '@/components/home/SocialProofStrip';

export function HeroSection(): ReactNode {
  return (
    <MeshGradientHero>
      <section className="relative overflow-hidden bg-white/80 py-20 sm:py-28 lg:py-36">
        <div className="section-max section-padding relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Building <AnimatedHeadline />,{' '}
              <span className="text-indigo-600">Empowering Lives</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-500">
              A diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CTAButton href="/businesses" variant="primary" size="lg">
                Explore Our Businesses
              </CTAButton>
              <CTAButton href="/careers" variant="outline" size="lg">
                View Careers
              </CTAButton>
              <CTAButton href="/contact" variant="outline" size="lg">
                Contact Us
              </CTAButton>
            </div>
          </div>
        </div>

        {/* Social Proof Strip */}
        <SocialProofStrip />
      </section>
    </MeshGradientHero>
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-100">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
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
