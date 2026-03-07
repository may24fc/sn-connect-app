'use client';

import { type ReactNode, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
  src: string;
  alt: string;
  caption: string;
  category?: string;
}

interface MasonryGridProps {
  photos: Photo[];
}

/** Placeholder background colors — one per card slot, loops every 8 */
const SLOT_COLORS = [
  '#E0E7FF', // indigo-100
  '#FEF3C7', // amber-100
  '#D1FAE5', // emerald-100
  '#FCE7F3', // pink-100
  '#EDE9FE', // violet-100
  '#FEE2E2', // red-100
  '#DBEAFE', // blue-100
  '#D1FAE5', // emerald-100
];

const CATEGORIES = ['All', 'Team Building', 'Office Life', 'Events'];

function getCategory(caption: string): string {
  const lower = caption.toLowerCase();
  if (lower.includes('team') || lower.includes('building') || lower.includes('lunch')) return 'Team Building';
  if (lower.includes('office') || lower.includes('headquarters') || lower.includes('wellness')) return 'Office Life';
  return 'Events';
}

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categorizedPhotos = photos.map((p) => ({
    ...p,
    category: p.category || getCategory(p.caption),
  }));

  const filteredPhotos = activeCategory === 'All'
    ? categorizedPhotos
    : categorizedPhotos.filter((p) => p.category === activeCategory);

  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pagePhotos = filteredPhotos.slice(start, start + PAGE_SIZE);

  // Reset page when category changes
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

  // Lightbox keyboard navigation
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const nextLightbox = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);
  const prevLightbox = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + filteredPhotos.length) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, nextLightbox, prevLightbox]);

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
                ? 'bg-indigo-600 text-white shadow-sm'
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
                  const colorIdx = (start + photoIdx) % SLOT_COLORS.length;
                  const globalIdx = start + photoIdx;

                  return (
                    <div
                      key={slotIdx}
                      className="group/card overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card transition-shadow hover:shadow-card-hover cursor-pointer"
                      style={{ flex: slot.flex }}
                      onClick={() => photo && setLightboxIndex(globalIdx)}
                    >
                      {/* Photo area */}
                      <div
                        className={`relative ${slot.height} flex items-center justify-center`}
                        style={{ backgroundColor: SLOT_COLORS[colorIdx] }}
                      >
                        {photo ? (
                          <>
                            <div className="flex flex-col items-center gap-2 text-zinc-400">
                              <ImageIcon className="h-8 w-8 opacity-40" />
                              <span className="text-xs">{photo.alt}</span>
                            </div>
                            {/* Hover overlay with zoom icon */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/card:bg-black/20 transition-colors">
                              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <ImageIcon className="h-8 w-8 text-zinc-300" />
                        )}
                      </div>

                      {/* Caption + category badge */}
                      {photo && (
                        <div className="flex items-center justify-between px-5 py-3.5">
                          <p className="text-sm font-medium text-zinc-700">{photo.caption}</p>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                            {(photo as Photo & { category?: string }).category || getCategory(photo.caption)}
                          </span>
                        </div>
                      )}
                    </div>
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
                i === page ? 'w-8 bg-indigo-600' : 'w-2 bg-zinc-300 hover:bg-zinc-400'
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={page === totalPages - 1}
            aria-label="Next set"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Navigation */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Content */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-h-[80vh] max-w-[80vw] overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex h-[60vh] w-[70vw] max-w-4xl items-center justify-center"
                style={{
                  backgroundColor: SLOT_COLORS[lightboxIndex % SLOT_COLORS.length],
                }}
              >
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <ImageIcon className="h-16 w-16 opacity-40" />
                  <span className="text-lg">{filteredPhotos[lightboxIndex].alt}</span>
                </div>
              </div>
              <div className="bg-white px-6 py-4">
                <p className="text-lg font-semibold text-zinc-900">
                  {filteredPhotos[lightboxIndex].caption}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {filteredPhotos[lightboxIndex].category || getCategory(filteredPhotos[lightboxIndex].caption)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {lightboxIndex + 1} of {filteredPhotos.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

