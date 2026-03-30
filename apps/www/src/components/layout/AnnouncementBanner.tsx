'use client';

import { type ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { WHATS_NEW } from '@/data/placeholder';
import {
  HIDE_EXPANSION_SECTIONS,
  isTemporarilyHiddenPublicPath,
} from '@/lib/site-config';

const DISMISS_KEY = 'sn-whats-new-dismissed';

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function AnnouncementBanner(): ReactNode {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash
  const visibleItems = WHATS_NEW.filter((item) => !isTemporarilyHiddenPublicPath(item.href));

  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(stored === 'true');
  }, []);

  if (HIDE_EXPANSION_SECTIONS || dismissed || visibleItems.length === 0) return null;

  const items = [...visibleItems, ...visibleItems];

  return (
    <div className="relative z-[40] flex items-center border-b border-zinc-100 bg-white">
      {/* Pinned "What's New" label */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-white pl-5 pr-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800 ring-1 ring-inset ring-primary-100">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-700" />
          What&apos;s New
        </span>
        <div className="h-4 w-px bg-zinc-200" aria-hidden="true" />
      </div>

      {/* Scrolling ticker */}
      <div className="group relative flex-1 overflow-hidden py-2.5">
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-white to-transparent"
          aria-hidden="true"
        />
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
              <span className="text-sm text-zinc-600">{item.text}</span>
              <span className="text-xs text-zinc-400">{formatDaysAgo(item.daysAgo)}</span>
              <span className="mx-5 select-none text-zinc-300" aria-hidden="true">
                ·
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem(DISMISS_KEY, 'true');
        }}
        className="relative z-20 flex shrink-0 items-center justify-center p-2 mr-2 text-zinc-400 transition-colors hover:text-zinc-600"
        aria-label="Dismiss announcements"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
