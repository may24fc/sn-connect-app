'use client';

import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Quote, Briefcase, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Spotlight {
  name: string;
  role: string;
  department: string;
  tenure: string;
  quote: string;
}

interface EmployeeSpotlightProps {
  spotlights: Spotlight[];
}

/** Extract initials from a full name (e.g. "Andrea Reyes" → "AR") */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

const AUTO_PLAY_MS = 6000;

export function EmployeeSpotlight({ spotlights }: EmployeeSpotlightProps): ReactNode {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const next = useCallback(() => {
    setDirection(1);
    setActive((prev) => (prev + 1) % spotlights.length);
  }, [spotlights.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setActive((prev) => (prev - 1 + spotlights.length) % spotlights.length);
  }, [spotlights.length]);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [next]);

  const spotlight = spotlights[active];
  if (!spotlight) return null;

  return (
    <div className="relative">
      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            className="p-8 md:p-10"
          >
            {/* Quote icon */}
            <Quote className="mb-4 h-8 w-8 text-amber-300" />

            {/* Quote text */}
            <p className="text-lg leading-relaxed text-zinc-600 italic md:text-xl">
              &ldquo;{spotlight.quote}&rdquo;
            </p>

            {/* Person info */}
            <div className="mt-6 flex items-center gap-4 border-t border-zinc-100 pt-6">
              {/* Avatar */}
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ${AVATAR_COLORS[active % AVATAR_COLORS.length]}`}
              >
                {getInitials(spotlight.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-zinc-900">{spotlight.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <Briefcase className="h-3 w-3" />
                    {spotlight.role}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                    {spotlight.department}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <Clock className="h-3 w-3" />
                    {spotlight.tenure}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation + dots */}
      <div className="mt-6 flex items-center justify-center">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {spotlights.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                setDirection(i > active ? 1 : -1);
                setActive(i);
              }}
              aria-label={`View ${s.name}'s spotlight`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? 'w-8 bg-slate-900' : 'w-2 bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
