'use client';

import { type ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface Photo {
  src: string;
  alt: string;
  caption: string;
  category: string;
  slug: string;
  description: string;
}

interface MasonryGridProps {
  photos: Photo[];
}

const CATEGORIES = ['All', 'Team Building', 'Office Life', 'Events'];

const ROW_CONFIGS = [
  [
    { flex: 3, height: 'h-72' },
    { flex: 2, height: 'h-72' },
  ],
  [
    { flex: 2, height: 'h-56' },
    { flex: 3, height: 'h-56' },
  ],
] as const;

const PAGE_SIZE = 4;

export function MasonryGrid({ photos }: MasonryGridProps): ReactNode {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPhotos =
    activeCategory === 'All' ? photos : photos.filter((p) => p.category === activeCategory);

  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pagePhotos = filteredPhotos.slice(start, start + PAGE_SIZE);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(0);
    setDirection(1);
  };

  const go = (dir: 1 | -1) => {
    const next = page + dir;
    if (next < 0 || next >= totalPages) return;
    setDirection(dir);
    setPage(next);
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -60 }),
  };

  return (
    <div>
      {/* Category filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bento grid */}
      <div className="relative">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={page === 0}
          aria-label="Previous set"
          className="absolute left-0 inset-y-0 z-10 w-14 hidden lg:flex items-center justify-start pl-3 bg-gradient-to-r from-zinc-50/80 to-transparent group disabled:pointer-events-none disabled:opacity-0 transition-opacity"
        >
          <ChevronLeft className="h-6 w-6 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={page === totalPages - 1}
          aria-label="Next set"
          className="absolute right-0 inset-y-0 z-10 w-14 hidden lg:flex items-center justify-end pr-3 bg-gradient-to-l from-zinc-50/80 to-transparent group disabled:pointer-events-none disabled:opacity-0 transition-opacity"
        >
          <ChevronRight className="h-6 w-6 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${activeCategory}-${page}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="flex flex-col gap-4">
              {ROW_CONFIGS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-4">
                  {row.map((slot, slotIdx) => {
                    const photoIdx = rowIdx * 2 + slotIdx;
                    const photo = pagePhotos[photoIdx];

                    if (!photo) {
                      return (
                        <div
                          key={slotIdx}
                          className={`relative overflow-hidden rounded-2xl bg-zinc-100 ${slot.height}`}
                          style={{ flex: slot.flex }}
                        >
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-zinc-300" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={slotIdx}
                        href={`/life-at-sn/${photo.slug}`}
                        className={`group/card relative block overflow-hidden rounded-2xl shadow-card ${slot.height}`}
                        style={{ flex: slot.flex }}
                      >
                        {/* Image fills the entire card */}
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />

                        {/* Hover overlay — emphasises title, description, badge over the image */}
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
                          <span className="mb-2 self-start rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                            {photo.category}
                          </span>
                          <h3 className="text-base font-bold leading-tight text-white drop-shadow">
                            {photo.caption}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-xs text-white/80">
                            {photo.description}
                          </p>
                          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20">
                            Learn More
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > page ? 1 : -1);
                setPage(i);
              }}
              aria-label={`Go to page ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page ? 'w-8 bg-slate-900' : 'w-2 bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={page === 0}
            aria-label="Previous set"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-amber-500 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={page === totalPages - 1}
            aria-label="Next set"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-amber-500 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

