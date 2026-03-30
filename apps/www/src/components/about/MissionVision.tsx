'use client';

import type { ReactNode } from 'react';
import { Compass, Eye } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { MISSION, VISION } from '@/data/placeholder';

export function MissionVision(): ReactNode {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-800">
            How We Work
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Built for teams that want leverage without losing quality.
          </h2>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Our operating model is simple: make support easier to trust, easier to onboard, and easier to scale.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <ScrollReveal direction="left">
            <div className="group rounded-[1.75rem] border border-primary-100 bg-[linear-gradient(180deg,rgba(96,153,172,0.08),rgba(255,255,255,1)_42%)] p-8 shadow-card transition-shadow hover:shadow-card-hover">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-800">
                <Compass className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-zinc-900">
                Our Mission
              </h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-primary-800" />
              <p className="mt-4 leading-relaxed text-zinc-600">
                {MISSION}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="group rounded-[1.75rem] border border-primary-100 bg-[linear-gradient(180deg,rgba(184,186,179,0.18),rgba(255,255,255,1)_42%)] p-8 shadow-card transition-shadow hover:shadow-card-hover">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-900">
                <Eye className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-zinc-900">
                Our Vision
              </h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-primary-800" />
              <p className="mt-4 leading-relaxed text-zinc-600">
                {VISION}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
