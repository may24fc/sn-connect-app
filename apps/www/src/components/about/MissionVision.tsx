'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { MISSION, VISION } from '@/data/placeholder';

export function MissionVision(): ReactNode {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        {/* Mission & Vision cards */}
        <div className="grid gap-8 md:grid-cols-2">
          <ScrollReveal direction="left">
            <div className="group rounded-xl border border-zinc-200 bg-white p-8 shadow-card transition-shadow hover:shadow-card-hover">
              <h3 className="text-2xl font-bold text-zinc-900">
                Our Mission
              </h3>
              <div className="mt-2 h-1 w-12 rounded-full bg-indigo-600" />
              <p className="mt-4 text-zinc-600 leading-relaxed">
                {MISSION}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="group rounded-xl border border-zinc-200 bg-white p-8 shadow-card transition-shadow hover:shadow-card-hover">
              <h3 className="text-2xl font-bold text-zinc-900">
                Our Vision
              </h3>
              <div className="mt-2 h-1 w-12 rounded-full bg-indigo-600" />
              <p className="mt-4 text-zinc-600 leading-relaxed">
                {VISION}
              </p>
            </div>
          </ScrollReveal>
        </div>

      </div>
    </section>
  );
}
