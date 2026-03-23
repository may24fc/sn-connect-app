'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const AUTO_ADVANCE_MS = 6000;

/** Portrait images used as testimonial avatars (Unsplash, stable URLs) */
const PORTRAITS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
];

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  company?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  /** Brand color of the business unit — used to highlight the first sentence */
  accentColor: string;
}

/**
 * Splits a quote into [highlighted first sentence, rest].
 * Falls back to the full quote + empty string if no sentence break found.
 */
function splitQuote(quote: string): [string, string] {
  const dot = quote.indexOf('. ');
  if (dot === -1) return [quote, ''];
  return [quote.slice(0, dot + 1), quote.slice(dot + 2)];
}

export function TestimonialCarousel({
  testimonials,
  accentColor,
}: TestimonialCarouselProps): ReactNode {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setActive(index);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActive((prev) => (prev + 1) % testimonials.length);
      }, AUTO_ADVANCE_MS);
    },
    [testimonials.length],
  );

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testimonials.length]);

  const current = testimonials[active]!;
  const portrait = PORTRAITS[active % PORTRAITS.length]!;
  const [highlight, rest] = splitQuote(current.quote);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-card">
      {/* Quote body */}
      <div className="relative px-8 pb-0 pt-12 sm:px-14 sm:pt-16 lg:px-20">
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-1/2 h-24 w-1 -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: accentColor }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <p className="text-center text-xl font-medium leading-relaxed text-zinc-900 sm:text-2xl lg:text-3xl">
              &ldquo;
              <span style={{ color: accentColor }}>{highlight}</span>
              {rest && (
                <>
                  {' '}
                  <span className="text-zinc-700">{rest}</span>
                </>
              )}
              &rdquo;
            </p>

            {/* Author */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <img
                src={portrait}
                alt={current.name}
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover ring-2 ring-zinc-200"
              />
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-900">{current.name}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {current.role}
                  {current.company && `, ${current.company}`}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2.5 pb-10 pt-8">
        {testimonials.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => goTo(i)}
            className="h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            style={{
              width: i === active ? '1.75rem' : '0.625rem',
              backgroundColor:
                i === active ? accentColor : '#D4D4D8',
            }}
          />
        ))}
      </div>
    </div>
  );
}
