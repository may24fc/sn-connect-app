'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CountUp } from '@/components/shared/CountUp';

const MILESTONES = [
  {
    year: '2010',
    title: 'Company Founded',
    description: 'SN International Group was established in Manila with a vision to build a diversified conglomerate that empowers Filipino communities.',
  },
  {
    year: '2013',
    title: 'SFO Launched',
    description: 'SeaFood Outlet opened its first central kitchen, beginning the food service arm that now serves thousands of meals daily.',
  },
  {
    year: '2016',
    title: 'UHP Established',
    description: 'Ultimate Health Project began distributing healthcare products to hospitals and pharmacies across Metro Manila.',
  },
  {
    year: '2019',
    title: '24 Fit Club Opens',
    description: '24 Fit Club launched its first location, bringing 24/7 fitness access to the community with modern equipment and expert trainers.',
  },
  {
    year: '2022',
    title: 'Construction Arm Expands',
    description: 'SN Property Development completed its 50th project, establishing the group as a trusted name in commercial and residential construction.',
  },
  {
    year: '2025',
    title: '500+ Employees Strong',
    description: 'The group reaches a milestone of over 500 employees across 4 business units, with operations spanning the Philippines.',
  },
] as const;

const COUNTER_STATS = [
  { value: 2010, label: 'Founded', prefix: '' },
  { value: 4, label: 'Business Units', suffix: '' },
  { value: 500, label: 'Employees', suffix: '+' },
  { value: 15, label: 'Years Strong', suffix: '+' },
];

export function CompanyTimeline(): ReactNode {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Our Journey
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-zinc-500">
            Key milestones that shaped SN International Group into what it is today.
          </p>
        </ScrollReveal>

        {/* Timeline */}
        <div className="relative mt-16">
          {/* Vertical center line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-zinc-200 lg:block" />
          <div className="absolute left-6 top-0 h-full w-px bg-zinc-200 lg:hidden" />

          <div className="space-y-12 lg:space-y-16">
            {MILESTONES.map((milestone, i) => {
              const isLeft = i % 2 === 0;

              return (
                <ScrollReveal key={milestone.year} delay={i * 0.1} direction={isLeft ? 'left' : 'right'}>
                  <div className="relative flex items-start gap-6 lg:gap-0">
                    {/* Mobile: simple dot icon */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white bg-zinc-100 shadow-md lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                      <span className="block h-3 w-3 rounded-full bg-zinc-900" />
                    </div>

                    {/* Content card */}
                    <div className={`flex-1 lg:w-[calc(50%-40px)] ${isLeft ? 'lg:mr-auto lg:pr-12' : 'lg:ml-auto lg:pl-12'}`}>
                      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
                        <span className="inline-block rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">
                          {milestone.year}
                        </span>
                        <h3 className="mt-3 text-lg font-semibold text-zinc-900">{milestone.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{milestone.description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

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
