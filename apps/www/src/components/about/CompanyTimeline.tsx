'use client';

import type { ReactNode } from 'react';
import { Timeline } from '@/components/ui/timeline';
import { CountUp } from '@/components/shared/CountUp';

const COUNTER_STATS = [
  { value: 2010, label: 'Founded', prefix: '' },
  { value: 4, label: 'Business Units', suffix: '' },
  { value: 500, label: 'Employees', suffix: '+' },
  { value: 15, label: 'Years Strong', suffix: '+' },
];

const TIMELINE_DATA = [
  {
    title: '2010',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">Company Founded</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          SN International Group was established in Manila with a vision to build a diversified
          conglomerate that empowers Filipino communities.
        </p>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Milestone</p>
          <p className="mt-1 text-sm text-zinc-700">
            Founding of SN International Group in Metro Manila, laying the groundwork for a
            multi-industry enterprise.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '2013',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">SFO Launched</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          SeaFood Outlet opened its first central kitchen, beginning the food service arm that now
          serves thousands of meals daily.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">1,000+</p>
            <p className="text-xs text-zinc-500">Daily meals served</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">1st</p>
            <p className="text-xs text-zinc-500">Central kitchen</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '2016',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">UHP Established</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          Ultimate Health Project began distributing healthcare products to hospitals and pharmacies
          across Metro Manila.
        </p>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Impact</p>
          <p className="mt-1 text-sm text-zinc-700">
            Partnering with hospitals and pharmacies to make quality healthcare products accessible
            to more Filipino families.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '2019',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">24 Fit Club Opens</h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          24 Fit Club launched its first location, bringing 24/7 fitness access to the community
          with modern equipment and expert trainers.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['24/7 Access', 'Modern Equipment', 'Expert Trainers', 'Community-Focused'].map(
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
    title: '2022',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">
          Construction Arm Expands
        </h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          SN Property Development completed its 50th project, establishing the group as a trusted
          name in commercial and residential construction.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">50+</p>
            <p className="text-xs text-zinc-500">Projects completed</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">2</p>
            <p className="text-xs text-zinc-500">Sectors served</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '2025',
    content: (
      <div>
        <h4 className="mb-4 text-lg font-semibold text-zinc-900 sm:text-xl">
          500+ Employees Strong
        </h4>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          The group reaches a milestone of over 500 employees across 4 business units, with
          operations spanning the Philippines.
        </p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Today</p>
          <p className="mt-1 text-sm text-amber-900">
            Four thriving business units. Over 500 dedicated team members. One shared mission to
            uplift Filipino communities.
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
        <div className="max-w-7xl mx-auto mb-8 px-4 md:px-8 lg:px-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-1.5">
            <span className="text-sm font-semibold text-amber-600">Since 2010</span>
          </div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-zinc-900 sm:text-4xl">
            Our Journey
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-zinc-500">
            Key milestones that shaped SN International Group into what it is today.
          </p>
        </div>

        <Timeline data={TIMELINE_DATA} />

        {/* Counter stats */}
        <div className="mt-20">
          <div className="rounded-2xl bg-zinc-900 px-8 py-12 sm:px-12">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {COUNTER_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-white sm:text-4xl">
                    <CountUp
                      end={stat.value}
                      {...(stat.suffix !== undefined ? { suffix: stat.suffix } : {})}
                      {...(stat.prefix !== undefined ? { prefix: stat.prefix } : {})}
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
