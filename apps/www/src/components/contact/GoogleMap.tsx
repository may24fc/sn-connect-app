'use client';

import type { ReactNode } from 'react';
import { GOOGLE_MAPS_EMBED_URL } from '@/data/placeholder';

export function GoogleMap(): ReactNode {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-card">
      <iframe
        src={GOOGLE_MAPS_EMBED_URL}
        width="100%"
        height="400"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="SN International Group Office Location"
      />
    </div>
  );
}
