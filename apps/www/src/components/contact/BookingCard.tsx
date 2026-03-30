'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRight, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';

interface BookingCardProps {
  scheduleUrl: string;
  embedUrl: string | null;
}

export function BookingCard({ scheduleUrl, embedUrl }: BookingCardProps): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-primary-200 bg-[linear-gradient(135deg,rgba(96,153,172,0.12),rgba(255,255,255,1)_46%,rgba(184,186,179,0.18))] shadow-card">
      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-800">
              Prefer a live conversation?
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-zinc-900">Book a Discovery Call</h3>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600">
              Best for sales conversations, partnerships, and discovery calls. Choose a time that
              works for you.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={scheduleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-900"
          >
            Open Booking Page
            <ArrowRight className="h-4 w-4" />
          </a>

          {embedUrl ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {open ? (
                <>
                  Hide calendar <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show calendar <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {embedUrl && open ? (
        <div className="border-t border-primary-100">
          <iframe
            src={embedUrl}
            title="Book a discovery call"
            className="h-[520px] w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}
    </div>
  );
}
