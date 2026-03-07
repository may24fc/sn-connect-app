'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Star,
  BookOpen,
  Heart,
  Users,
  Zap,
} from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

const WHY_ITEMS = [
  {
    title: 'Growth Opportunities',
    desc: 'Clear career paths and cross-functional mobility across all business units.',
    stat: '85% internal promotion rate',
    icon: TrendingUp,
  },
  {
    title: 'Competitive Benefits',
    desc: 'Comprehensive compensation, health coverage, and performance bonuses.',
    stat: 'Above-market compensation + HMO',
    icon: Star,
  },
  {
    title: 'Learning & Development',
    desc: 'Access to training programs, workshops, and mentorship opportunities.',
    stat: '200+ training hours per employee per year',
    icon: BookOpen,
  },
  {
    title: 'Work-Life Balance',
    desc: 'Flexible arrangements, wellness programs, and team activities.',
    stat: 'Hybrid work + wellness stipend',
    icon: Heart,
  },
  {
    title: 'Inclusive Culture',
    desc: 'A diverse and supportive environment where every voice matters.',
    stat: '50+ nationalities across business units',
    icon: Users,
  },
  {
    title: 'Impact & Purpose',
    desc: 'Work that makes a real difference in communities across the Philippines.',
    stat: '10,000+ community beneficiaries',
    icon: Zap,
  },
];

const TOTAL = WHY_ITEMS.length;
const CARD_SPACING = 178;

function getItemState(itemIndex: number, active: number) {
  const dist = ((itemIndex - active) % TOTAL + TOTAL) % TOTAL;
  if (dist === 0) {
    return { y: 0, scale: 1, opacity: 1, zIndex: 10, pointerEvents: 'auto' as const };
  }
  if (dist === 1) {
    return { y: CARD_SPACING, scale: 0.85, opacity: 0.5, zIndex: 5, pointerEvents: 'auto' as const };
  }
  if (dist === TOTAL - 1) {
    return { y: -CARD_SPACING, scale: 0.85, opacity: 0.5, zIndex: 5, pointerEvents: 'auto' as const };
  }
  // Far items go off-screen in the appropriate direction
  if (dist <= Math.floor(TOTAL / 2)) {
    return { y: CARD_SPACING * 2, scale: 0.72, opacity: 0, zIndex: 0, pointerEvents: 'none' as const };
  }
  return { y: -CARD_SPACING * 2, scale: 0.72, opacity: 0, zIndex: 0, pointerEvents: 'none' as const };
}

export function WhyCarousel(): ReactNode {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % TOTAL);
    }, 4000);
  }, []);

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetAutoplay]);

  const goTo = (index: number) => {
    setActive(((index % TOTAL) + TOTAL) % TOTAL);
    resetAutoplay();
  };
  const prev = () => goTo(active - 1);
  const next = () => goTo(active + 1);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
      {/* Left ─ heading, subtitle, nav */}
      <div className="lg:w-[360px] shrink-0">
        <ScrollReveal>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Why SN International Group?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-500">
            We invest in our people because they&apos;re the foundation of everything we build.
          </p>

          {/* Up/down nav */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous reason"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next reason"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="mt-4 flex items-center gap-1.5">
            {WHY_ITEMS.map((item, i) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to ${item.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? 'w-6 bg-indigo-600' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Right ─ vertical carousel */}
      <div className="flex-1">
        {/* Outer fade masks for top/bottom bleed effect */}
        <div className="relative h-[400px]">
          {/* Top fade */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-zinc-50 to-transparent" />
          {/* Bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-zinc-50 to-transparent" />

          <div className="relative h-full">
            {WHY_ITEMS.map((item, i) => {
              const state = getItemState(i, active);
              const Icon = item.icon;
              const isActive = i === active;

              return (
                <div
                  key={item.title}
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                  style={{ zIndex: state.zIndex, pointerEvents: 'none' }}
                >
                  <motion.div
                    initial={getItemState(i, 0)}
                    animate={{
                      y: state.y,
                      scale: state.scale,
                      opacity: state.opacity,
                    }}
                    transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                    style={{ pointerEvents: state.pointerEvents }}
                  >
                    <div
                      className={`rounded-xl border bg-white p-6 transition-all ${
                        isActive
                          ? 'border-indigo-200 shadow-card-hover'
                          : 'border-zinc-200 shadow-card cursor-pointer hover:border-indigo-100'
                      }`}
                      onClick={!isActive ? () => goTo(i) : undefined}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                          <Icon className="h-6 w-6 text-zinc-900" />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={`font-semibold ${
                              isActive ? 'text-zinc-900' : 'text-zinc-700'
                            }`}
                          >
                            {item.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                            {item.desc}
                          </p>
                          {isActive && (
                            <p className="mt-2 text-xs font-semibold text-indigo-600">
                              {item.stat}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
