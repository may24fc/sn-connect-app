'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BUSINESS_UNITS, WHATS_NEW } from '@/data/placeholder';
import { AnimatedHeadline } from '@/components/shared/AnimatedHeadline';
import {
  HIDE_EXPANSION_SECTIONS,
  isTemporarilyHiddenPublicPath,
} from '@/lib/site-config';

export function HeroSection(): ReactNode {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push('/contact');
      return;
    }

    router.push(`/contact?need=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] items-center overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(96,153,172,0.20),_transparent_36%),linear-gradient(180deg,#f7fbfc_0%,#ffffff_70%)] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400 to-transparent" />

      <div className="section-max section-padding relative w-full">
        <div className="mx-auto max-w-5xl text-center">
        

          <h1 className="mx-auto mt-6 max-w-5xl text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl lg:leading-[1.02]">
            <span className="block">You&apos;re one brief away from</span>
            <span className="block md:whitespace-nowrap">
              the right <AnimatedHeadline className="justify-center" /> support team.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-600 sm:text-lg">
            We build dependable offshore support around your workflow, from executive assistance and marketing support to content creation and AI operations.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 flex max-w-4xl flex-col gap-3 rounded-[1.75rem] border border-zinc-200 bg-white p-3 shadow-[0_20px_60px_rgba(23,80,99,0.12)] sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tell us what support you need"
                className="h-14 w-full rounded-2xl border border-transparent bg-transparent pl-12 pr-4 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-primary-200"
                aria-label="Describe the support you need"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-900 sm:min-w-[220px]"
            >
              Connect to support
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {BUSINESS_UNITS.map((unit) => (
              <Link
                key={unit.slug}
                href={`/contact?service=${unit.slug}`}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-900"
              >
                {unit.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function WhatsNewMarquee(): ReactNode {
  if (HIDE_EXPANSION_SECTIONS) return null;

  const visibleItems = WHATS_NEW.filter((item) => !isTemporarilyHiddenPublicPath(item.href));
  const items = [...visibleItems, ...visibleItems];

  return (
    <section className="relative flex items-center border-y border-zinc-100 bg-white py-3">
      {/* Pinned "What's New" label */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-white pl-5 pr-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800 ring-1 ring-inset ring-primary-100">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-700" />
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
