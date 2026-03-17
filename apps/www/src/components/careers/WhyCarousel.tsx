'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

const WHY_ITEMS = [
  {
    title: 'Growth Opportunities',
    desc: 'Clear career paths and cross-functional mobility across all business units.',
    stat: '85% internal promotion rate',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Team collaborating at work',
  },
  {
    title: 'Competitive Benefits',
    desc: 'Comprehensive compensation, health coverage, and performance bonuses.',
    stat: 'Above-market pay + full HMO coverage',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Employees in the workplace',
  },
  {
    title: 'Learning & Development',
    desc: 'Access to training programs, workshops, and mentorship opportunities.',
    stat: '200+ training hours per employee per year',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Professional training session',
  },
  {
    title: 'Work-Life Balance',
    desc: 'Flexible arrangements, wellness programs, and team activities.',
    stat: 'Hybrid work + wellness stipend',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Modern collaborative office',
  },
  {
    title: 'Inclusive Culture',
    desc: 'A diverse and supportive environment where every voice matters.',
    stat: '50+ nationalities across business units',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Diverse team working together',
  },
  {
    title: 'Impact & Purpose',
    desc: 'Work that makes a real difference in communities across the Philippines.',
    stat: '10,000+ community beneficiaries',
    image: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=96&q=80&auto=format&fit=crop',
    imageAlt: 'Community impact project',
  },
];

const TOTAL = WHY_ITEMS.length;
const CARD_SPACING = 172;

function getItemState(itemIndex: number, active: number) {
  const dist = ((itemIndex - active) % TOTAL + TOTAL) % TOTAL;
  if (dist === 0) {
    return {
      y: 0,
      scale: 1.05,
      opacity: 1,
      filter: 'grayscale(0) blur(0px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      zIndex: 10,
      pointerEvents: 'auto' as const,
    };
  }
  if (dist === 1) {
    return {
      y: CARD_SPACING,
      scale: 0.91,
      opacity: 0.6,
      filter: 'grayscale(0.9) blur(3px)',
      boxShadow: '0 0 0px 0px rgba(99,102,241,0)',
      zIndex: 5,
      pointerEvents: 'auto' as const,
    };
  }
  if (dist === TOTAL - 1) {
    return {
      y: -CARD_SPACING,
      scale: 0.91,
      opacity: 0.6,
      filter: 'grayscale(0.9) blur(3px)',
      boxShadow: '0 0 0px 0px rgba(99,102,241,0)',
      zIndex: 5,
      pointerEvents: 'auto' as const,
    };
  }
  if (dist <= Math.floor(TOTAL / 2)) {
    return {
      y: CARD_SPACING * 2.3,
      scale: 0.78,
      opacity: 0,
      filter: 'grayscale(1) blur(6px)',
      boxShadow: '0 0 0px 0px rgba(99,102,241,0)',
      zIndex: 0,
      pointerEvents: 'none' as const,
    };
  }
  return {
    y: -CARD_SPACING * 2.3,
    scale: 0.78,
    opacity: 0,
    filter: 'grayscale(1) blur(6px)',
    boxShadow: '0 0 0px 0px rgba(99,102,241,0)',
    zIndex: 0,
    pointerEvents: 'none' as const,
  };
}

function StatDisplay({ stat }: { stat: string }): ReactNode {
  const match = stat.match(/^([\d,]+[+%]?)/);
  const leading = match?.[1];
  if (leading) {
    return (
      <span>
        <span className="font-bold text-amber-600">{leading}</span>
        {stat.slice(leading.length)}
      </span>
    );
  }
  return <span className="font-semibold text-amber-600">{stat}</span>;
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

          {/* Up/down nav — ghost buttons */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous reason"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-transparent text-zinc-600 transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next reason"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-transparent text-zinc-600 transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
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
                  i === active ? 'w-6 bg-slate-900' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Right ─ vertical focus-scroll carousel */}
      <div className="flex-1">
        <div className="relative h-[400px]">
          <div className="relative h-full ">
            {WHY_ITEMS.map((item, i) => {
              const state = getItemState(i, active);
              const isActive = i === active;

              return (
                <div
                  key={item.title}
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                  style={{ zIndex: state.zIndex, pointerEvents: 'none' }}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      y: state.y,
                      scale: state.scale,
                      opacity: state.opacity,
                      filter: state.filter,
                      boxShadow: state.boxShadow,
                    }}
                    transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                    style={{ pointerEvents: state.pointerEvents }}
                    className="rounded-2xl overflow-hidden"
                  >
                    <div
                      className={`rounded-2xl border p-5 transition-colors ${
                        isActive
                          ? 'border-amber-200/70 bg-white'
                          : 'cursor-pointer border-transparent bg-transparent'
                      }`}
                      onClick={!isActive ? () => goTo(i) : undefined}
                    >
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-lg font-bold tracking-tight ${
                              isActive ? 'text-zinc-900' : 'text-zinc-700'
                            }`}
                          >
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                            {item.desc}
                          </p>
                          <p className="mt-2 text-xs leading-snug text-zinc-500">
                            <StatDisplay stat={item.stat} />
                          </p>
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
