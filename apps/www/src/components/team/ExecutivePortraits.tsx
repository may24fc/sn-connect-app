'use client';

import {
  type ReactNode,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import Image from 'next/image';
import { Mail, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

interface Executive {
  name: string;
  title: string;
  bio?: string;
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
        className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Full poster for ${person.name}`}
      >
        <div className="flex h-full w-full items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-zinc-900 shadow-lg transition-colors duration-200 hover:bg-white"
              aria-label="Close full poster"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/10">
              <div className="relative flex max-h-[88vh] items-center justify-center bg-[radial-gradient(circle_at_top,#f8fafc,transparent_55%),linear-gradient(180deg,#fafaf9,#f4f4f5)] p-3 md:p-4">
                <Image
                  src={person.image}
                  alt={`${person.name} executive poster`}
                  width={768}
                  height={1024}
                  unoptimized
                  className="h-auto max-h-[82vh] w-auto max-w-full object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>
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
      className="group mx-auto w-full max-w-sm"
    >
      {/* Poster preview */}
      {person.image ? (
        <button
          type="button"
          onClick={() => onOpenImage(person)}
          className="block w-full text-left"
          aria-label={`Open full poster for ${person.name}`}
        >
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,rgba(96,153,172,0.14),transparent_28%),linear-gradient(180deg,#ffffff,#f8fafc)] p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_34px_90px_-44px_rgba(15,23,42,0.4)]">
            <div className="relative flex min-h-[23rem] items-center justify-center overflow-hidden rounded-[20px] bg-zinc-50 sm:min-h-[26rem]">
              <Image
                src={person.image}
                alt={`${person.name} executive poster`}
                width={768}
                height={1024}
                unoptimized
                className="h-auto max-h-[26rem] w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.01] sm:max-h-[29rem]"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 360px"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-zinc-950/70 via-zinc-950/15 to-transparent px-4 pb-4 pt-10 text-white opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                <span className="text-xs font-medium tracking-[0.14em] text-white/85 uppercase">
                  View full poster
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                  <Expand className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-gradient-to-br from-zinc-100 to-zinc-200/60 p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="relative flex min-h-[23rem] items-end justify-end overflow-hidden rounded-[20px] bg-zinc-100 sm:min-h-[26rem]">
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
      <div className="mt-5 px-1">
        <h3 className="text-[1.125rem] font-bold tracking-tight text-zinc-900">
          {person.name}
        </h3>

        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          {person.title}
        </p>

        {(person.bio || person.email) && <div className="mt-4 h-px w-8 bg-zinc-900" />}

        {person.bio && (
          <p className="mt-4 text-sm leading-[1.7] text-zinc-500">{person.bio}</p>
        )}

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedExecutive]);

  if (executives.length <= 3) {
    const gridClassName =
      executives.length === 1
        ? 'mx-auto max-w-md grid grid-cols-1 gap-10'
        : executives.length === 2
          ? 'mx-auto max-w-4xl grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 md:items-start'
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
