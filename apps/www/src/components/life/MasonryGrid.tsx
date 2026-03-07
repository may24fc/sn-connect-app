'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Photo {
  src: string;
  alt: string;
  caption: string;
}

interface MasonryGridProps {
  photos: Photo[];
}

export function MasonryGrid({ photos }: MasonryGridProps): ReactNode {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {photos.map((photo, i) => (
        <ScrollReveal key={photo.src} delay={i * 0.08}>
          <div className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card">
            {/* Placeholder */}
            <div
              className="flex items-center justify-center bg-zinc-50"
              style={{ height: `${200 + (i % 3) * 60}px` }}
            >
              <span className="text-sm text-zinc-300">Photo</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-zinc-700">{photo.caption}</p>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
