'use client';

import type { ReactNode } from 'react';
import { MapPin, Building } from 'lucide-react';
import { GOOGLE_MAPS_EMBED_URL } from '@/data/placeholder';

export function GoogleMap(): ReactNode {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map */}
      <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-zinc-200 shadow-card">
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

      {/* Office photo placeholder */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-card">
        <div className="flex h-full min-h-[250px] flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-zinc-50 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Building className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900">Our Office</h3>
          <p className="mt-1 text-sm text-zinc-500">
            SN International Tower
          </p>
          <p className="text-sm text-zinc-500">
            Bonifacio Global City, Taguig
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-600">
            <MapPin className="h-3.5 w-3.5" />
            Metro Manila, Philippines
          </div>
        </div>
      </div>
    </div>
  );
}
