'use client';

import { type ReactNode, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

interface Executive {
  name: string;
  title: string;
  bio: string;
  image?: string;
  email?: string;
}

interface ExecutivePortraitsProps {
  executives: Executive[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ExecutiveCard({ person, index }: { person: Executive; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{
        duration: 0.7,
        delay: index * 0.12,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group"
    >
      {/* Vertical portrait */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100">
        {person.image ? (
          <Image
            src={person.image}
            alt={person.name}
            fill
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          /* Editorial placeholder — faint oversized initial anchored to bottom-right */
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200/60">
            <span
              aria-hidden="true"
              className="absolute -bottom-3 -right-2 select-none text-[10rem] font-black leading-none tracking-tighter text-zinc-300/70"
            >
              {getInitials(person.name)[0]}
            </span>
          </div>
        )}
        {/* Scrim on hover */}
        <div className="absolute inset-0 bg-zinc-900/0 transition-colors duration-500 group-hover:bg-zinc-900/[0.07]" />
      </div>

      {/* Editorial metadata beneath portrait */}
      <div className="mt-5">
        <h3 className="text-[1.125rem] font-bold tracking-tight text-zinc-900">
          {person.name}
        </h3>

        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          {person.title}
        </p>

        {/* Accent rule */}
        <div className="mt-4 h-px w-8 bg-zinc-900" />

        <p className="mt-4 text-sm leading-[1.7] text-zinc-500">{person.bio}</p>

        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-zinc-400 transition-colors duration-200 hover:text-zinc-900"
            aria-label={`Email ${person.name}`}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>{person.email}</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function ExecutivePortraits({ executives }: ExecutivePortraitsProps): ReactNode {
  if (executives.length <= 3) {
    return (
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {executives.map((person, i) => (
          <ExecutiveCard key={person.name} person={person} index={i} />
        ))}
      </div>
    );
  }

  return <ExecutiveCarousel executives={executives} />;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '6%' : '-6%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] },
  },
  exit: (dir: number) => ({
    x: dir < 0 ? '6%' : '-6%',
    opacity: 0,
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

function ExecutiveCarousel({ executives }: { executives: Executive[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = executives.length;
  const maxIndex = total - 3;

  const goTo = useCallback(
    (index: number, dir: number) => {
      setDirection(dir);
      setCurrentIndex(index);
    },
    [],
  );

  const prev = () => currentIndex > 0 && goTo(currentIndex - 1, -1);
  const next = () => currentIndex < maxIndex && goTo(currentIndex + 1, 1);

  const visible = executives.slice(currentIndex, currentIndex + 3);

  return (
    <div className="group/carousel relative">
      {/* Prev button — left side, vertically centered, show on hover */}
      <button
        type="button"
        onClick={prev}
        disabled={currentIndex === 0}
        aria-label="Previous executives"
        className="absolute -left-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 opacity-0 shadow-md transition-all duration-200 group-hover/carousel:opacity-100 hover:border-zinc-900 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Next button — right side, vertically centered, show on hover */}
      <button
        type="button"
        onClick={next}
        disabled={currentIndex === maxIndex}
        aria-label="Next executives"
        className="absolute -right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 opacity-0 shadow-md transition-all duration-200 group-hover/carousel:opacity-100 hover:border-zinc-900 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Slide area */}
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((person, i) => (
              <ExecutiveCard key={person.name} person={person} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators + counter */}
      <div className="mt-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > currentIndex ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-6 bg-zinc-900'
                  : 'w-1.5 bg-zinc-300 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
        <p className="text-xs tabular-nums text-zinc-400">
          {currentIndex + 1}–{Math.min(currentIndex + 3, total)} of {total}
        </p>
      </div>
    </div>
  );
}
