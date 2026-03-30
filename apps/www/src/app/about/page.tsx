import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MissionVision } from '@/components/about/MissionVision';
import { CEOMessage } from '@/components/about/CEOMessage';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'About',
  description: `Learn how ${COMPANY.name} builds managed offshore support teams with structured onboarding, dependable delivery, and role matching built for fast-moving businesses.`,
};

export default function AboutPage(): ReactNode {
  return (
    <>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(96,153,172,0.18),_transparent_34%),linear-gradient(180deg,#f7fbfc_0%,#ffffff_72%)] py-20 lg:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400 to-transparent" />

        <div className="section-max section-padding text-center">

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            The operating partner behind dependable remote support.
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
            {COMPANY.description}
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-5 shadow-[0_16px_40px_rgba(23,80,99,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-800">
                Matching model
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">Agency-led and role-aware</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                We scope the work, shape the brief, and match support around real workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-5 shadow-[0_16px_40px_rgba(23,80,99,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-800">
                Delivery standard
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">Structured onboarding, clean handoff</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Every engagement is built with clarity around tools, tone, cadence, and accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MissionVision />
      <CEOMessage />
    </>
  );
}
