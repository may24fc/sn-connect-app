'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { BUSINESS_UNITS } from '@/data/placeholder';

const AUTOPLAY_MS = 5000;

export function BusinessCards(): ReactNode {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = BUSINESS_UNITS.length;

  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress(0);

    // Progress bar update every 50ms
    const step = 50;
    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + (step / AUTOPLAY_MS) * 100, 100));
    }, step);

    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
      setProgress(0);
    }, AUTOPLAY_MS);
  }, [total]);

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [resetAutoplay]);

  const goTo = (index: number) => {
    setActive(index);
    resetAutoplay();
  };

  const prev = () => goTo((active - 1 + total) % total);
  const next = () => goTo((active + 1) % total);

  // Swipe handler
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) next();
    else if (info.offset.x > threshold) prev();
  };

  const unit = BUSINESS_UNITS[active]!;

  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {/* Left — heading, subtitle, nav */}
          <div className="lg:w-[380px] shrink-0 mb-10 lg:mb-0">
            <ScrollReveal>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
                Our Businesses
              </h2>
              <p className="mt-4 text-xl leading-relaxed text-zinc-500 sm:text-2xl">
                Four dynamic ventures united by a commitment to excellence.
              </p>

              {/* Arrows */}
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous business"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next business"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Progress indicators */}
              <div className="mt-4 flex items-center gap-2">
                {BUSINESS_UNITS.map((u, i) => (
                  <button
                    key={u.slug}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to ${u.name}`}
                    className="relative h-1.5 flex-1 max-w-12 overflow-hidden rounded-full bg-zinc-200"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-indigo-600 transition-all duration-100"
                      style={{
                        width: i === active ? `${progress}%` : i < active ? '100%' : '0%',
                      }}
                    />
                  </button>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right — active card with swipe */}
          <div className="flex-1">
            <div className="relative min-h-[380px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={unit.slug}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <Link
                    href={`/businesses/${unit.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card transition-shadow hover:shadow-card-hover"
                    draggable={false}
                  >
                    {/* Hero image area */}
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={unit.image}
                        alt={unit.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      {/* Subtle gradient at bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8">
                      <h3 className="text-xl font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors sm:text-2xl">
                        {unit.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-zinc-500">
                        {unit.tagline}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-500 line-clamp-3">
                        {unit.description}
                      </p>

                      {/* Key stats */}
                      {unit.stats.length > 0 && (
                        <div className="mt-4 flex gap-6">
                          {unit.stats.map((stat) => (
                            <div key={stat.label}>
                              <p className="text-lg font-bold text-zinc-900">{stat.value}</p>
                              <p className="text-xs text-zinc-500">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
                        Learn more <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>

                  {unit.website_url && (
                    <a
                      href={unit.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit Website
                    </a>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
