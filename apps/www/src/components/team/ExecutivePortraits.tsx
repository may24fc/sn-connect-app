'use client';

import {
  type ReactNode,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import Image, { type StaticImageData } from 'next/image';
import { Mail, ChevronLeft, ChevronRight, Expand, X, Linkedin } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

interface Executive {
  name: string;
  title: string;
  shortTitle?: string;
  bio?: string;
  image?: string | StaticImageData;
  email?: string;
  linkedin?: string;
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

function ExecutiveLightbox({
  person,
  onClose,
}: {
  person: Executive;
  onClose: () => void;
}) {
  if (!person.image) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Full poster for ${person.name}`}
      >
        <div className="flex min-h-full w-full items-start justify-center px-4 py-8 md:px-12 md:py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onClose(); }}
              className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg backdrop-blur-sm transition-colors duration-200 hover:bg-white"
              aria-label="Close full poster"
            >
              <X className="h-5 w-5" />
            </button>

            <Image
              src={person.image}
              alt={`${person.name} executive poster`}
              width={768}
              height={1024}
              className="w-auto max-w-[80vw] rounded-2xl object-contain shadow-2xl sm:max-w-[60vw] md:max-w-[45vw] lg:max-w-[35vw]"
              sizes="(max-width: 640px) 80vw, (max-width: 768px) 60vw, (max-width: 1024px) 45vw, 35vw"
              priority
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ExecutiveCard({
  person,
  index,
  onOpenImage,
}: {
  person: Executive;
  index: number;
  onOpenImage: (person: Executive) => void;
}) {
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
      className="group mx-auto w-full"
    >
      {/* Poster preview */}
      {person.image ? (
        <button
          type="button"
          onClick={() => onOpenImage(person)}
          className="block w-full text-left"
          aria-label={`Open full poster for ${person.name}`}
        >
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-200/60 bg-[radial-gradient(circle_at_top,rgba(96,153,172,0.12),transparent_32%),linear-gradient(180deg,#ffffff,#fafbfc)] p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] ring-1 ring-zinc-100 transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:border-primary-200/60 group-hover:shadow-[0_34px_90px_-44px_rgba(15,23,42,0.35)] group-hover:ring-primary-100 sm:p-4">
            <div className="relative flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[20px] bg-zinc-50/80 sm:min-h-[34rem]">
              <Image
                src={person.image}
                alt={`${person.name} executive poster`}
                width={768}
                height={1024}
                className="h-auto max-h-[32rem] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.015] sm:max-h-[38rem]"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 440px"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-zinc-950/60 via-zinc-950/10 to-transparent px-5 pb-5 pt-12 text-white opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                <span className="text-[11px] font-semibold tracking-[0.16em] text-white/90 uppercase">
                  View full poster
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md transition-colors duration-200 group-hover:bg-white/20">
                  <Expand className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-[28px] border border-zinc-200/60 bg-gradient-to-br from-zinc-100 to-zinc-200/60 p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] ring-1 ring-zinc-100 sm:p-4">
          <div className="relative flex min-h-[28rem] items-end justify-end overflow-hidden rounded-[20px] bg-zinc-100 sm:min-h-[34rem]">
            <span
              aria-hidden="true"
              className="absolute -bottom-3 -right-2 select-none text-[10rem] font-black leading-none tracking-tighter text-zinc-300/70"
            >
              {getInitials(person.name)[0]}
            </span>
          </div>
        </div>
      )}

      {/* Editorial metadata beneath portrait */}
      <div className="mt-6 px-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            {person.name}
          </h3>
          {person.shortTitle && (
            <span className="inline-flex items-center rounded-md border border-primary-200/80 bg-primary-50/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800">
              {person.shortTitle}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          {person.title}
        </p>

        {(person.bio || person.email || person.linkedin) && (
          <div className="mt-4 h-px w-10 bg-gradient-to-r from-zinc-900 to-transparent" />
        )}

        {person.bio && (
          <p className="mt-4 text-[0.8125rem] italic leading-[1.75] text-zinc-500">
            &ldquo;{person.bio}&rdquo;
          </p>
        )}

        {(person.email || person.linkedin) && (
          <div className="mt-5 flex items-center gap-2.5">
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-medium tracking-wide text-zinc-500 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-md"
                aria-label={`Email ${person.name}`}
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>{person.email}</span>
              </a>
            )}
            {person.linkedin && (
              <a
                href={person.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md"
                aria-label={`${person.name} on LinkedIn`}
              >
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ExecutivePortraits({ executives }: ExecutivePortraitsProps): ReactNode {
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);

  useEffect(() => {
    if (!selectedExecutive) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedExecutive(null);
      }
    };

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      html.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedExecutive]);

  if (executives.length <= 3) {
    const gridClassName =
      executives.length === 1
        ? 'mx-auto max-w-md grid grid-cols-1 gap-10'
        : executives.length === 2
          ? 'mx-auto max-w-5xl grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 md:items-start'
          : 'grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3';

    return (
      <>
        <div className={gridClassName}>
          {executives.map((person, i) => (
            <ExecutiveCard
              key={person.name}
              person={person}
              index={i}
              onOpenImage={setSelectedExecutive}
            />
          ))}
        </div>
        {selectedExecutive && (
          <ExecutiveLightbox
            person={selectedExecutive}
            onClose={() => setSelectedExecutive(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ExecutiveCarousel
        executives={executives}
        onOpenImage={setSelectedExecutive}
      />
      {selectedExecutive && (
        <ExecutiveLightbox
          person={selectedExecutive}
          onClose={() => setSelectedExecutive(null)}
        />
      )}
    </>
  );
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

function ExecutiveCarousel({
  executives,
  onOpenImage,
}: {
  executives: Executive[];
  onOpenImage: (person: Executive) => void;
}) {
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
              <ExecutiveCard
                key={person.name}
                person={person}
                index={i}
                onOpenImage={onOpenImage}
              />
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
