'use client';

import type { ReactNode } from 'react';
import { Timeline } from '@/components/ui/timeline';
import { CountUp } from '@/components/shared/CountUp';
import { BUSINESS_UNITS, COMPANY } from '@/data/placeholder';

const COUNTER_STATS = [
  { value: 2010, label: 'Founded' },
  { value: BUSINESS_UNITS.length, label: 'Service Tracks' },
  { value: 48, label: 'Hour Shortlist', suffix: 'h' },
  { value: 2, label: 'Markets Ready' },
];

const TIMELINE_DATA = [
  {
    title: '2010',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">The Operating Standard Was Set</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          {COMPANY.name} started with a simple bias toward reliability: clear process, strong follow-through, and work that makes teams easier to run.
        </p>
        <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-800">Foundation</p>
          <p className="mt-1 text-sm text-zinc-700">
            The business was built around dependable delivery long before VA outsourcing became the current focus.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '2016',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">Service Operations Got Sharper</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          Years of running fast-moving service work strengthened the systems behind scheduling, coordination, reporting, and client responsiveness.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">SOPs</p>
            <p className="text-xs text-zinc-500">Documented for repeatability</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">QA</p>
            <p className="text-xs text-zinc-500">Built into delivery habits</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '2020',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">Distributed Coordination Became Core</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          Remote collaboration stopped being an edge case and became part of how the company operated, coordinated, and kept work moving across teams.
        </p>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Capability</p>
          <p className="mt-1 text-sm text-zinc-700">
            Tooling, handoffs, and team rituals were refined for distributed work instead of office-bound support.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '2022',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">Support Pods Were Formalized</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          SN shaped a clearer managed-service model: scoped roles, onboarding checkpoints, quality control, and cleaner reporting for clients.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['Role briefs', 'Onboarding checklists', 'QA reviews', 'Weekly visibility'].map(
            (tag) => (
              <span
                key={tag}
                className="inline-block rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600"
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    title: '2024',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">Cross-Market Delivery Became Repeatable</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          Delivery patterns were refined for Australian and US-facing teams, with clearer handoffs,
          communication rhythms, and performance visibility across time zones.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">AU</p>
            <p className="text-xs text-zinc-500">Client-facing coverage</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">US</p>
            <p className="text-xs text-zinc-500">Operational readiness</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '2025',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">The VA Outsourcing Offer Goes Public</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          The public-facing offer is now focused on managed remote support across executive assistance, marketing support, content creation, and AI operations.
        </p>
        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-800">Today</p>
          <p className="mt-1 text-sm text-primary-950">
            A managed model, a clearer point of view, and {BUSINESS_UNITS.length} service tracks built for modern operators.
          </p>
        </div>
      </div>
    ),
  },
];

export function CompanyTimeline(): ReactNode {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <div className="mx-auto mb-8 max-w-7xl px-4 md:px-8 lg:px-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5">
            <span className="text-sm font-semibold text-primary-800">Since 2010</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Our Journey
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-zinc-500">
            The path from internal operating discipline to a clearer, service-led outsourcing offer.
          </p>
        </div>

        <Timeline data={TIMELINE_DATA} />

        <div className="mt-20">
          <div className="rounded-[2rem] bg-zinc-950 px-8 py-12 sm:px-12">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {COUNTER_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-white sm:text-4xl">
                    <CountUp
                      end={stat.value}
                      {...(stat.suffix !== undefined ? { suffix: stat.suffix } : {})}
                    />
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
