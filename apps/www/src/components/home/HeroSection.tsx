'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Utensils, Building2, Dumbbell, HardHat } from 'lucide-react';
import { WHATS_NEW } from '@/data/placeholder';
import { CTAButton } from '@/components/shared/CTAButton';
import { AnimatedHeadline } from '@/components/shared/AnimatedHeadline';
import { SocialProofStrip } from '@/components/home/SocialProofStrip';

const CardSwap = dynamic(() => import('@/components/CardSwap'), { ssr: false });
const { Card } = require('@/components/CardSwap');

const BUSINESSES = [
  {
    name: 'SFO (SeaFood Outlet)',
    tagline: 'Nourishing Communities, One Meal at a Time',
    icon: Utensils,
    color: '#C5A059',
    gradient: 'from-amber-100 to-amber-100',
    borderClass: 'border-amber-200',
    labelBorder: 'border-amber-200',
    labelBg: 'bg-amber-50/80',
  },
  {
    name: 'UHP (Ultimate Health Project)',
    tagline: 'Healthcare Solutions for Every Filipino',
    icon: Building2,
    color: '#2563EB',
    gradient: 'from-blue-100 to-blue-100',
    borderClass: 'border-blue-200',
    labelBorder: 'border-blue-200',
    labelBg: 'bg-blue-50/80',
  },
  {
    name: '24 Fit Club',
    tagline: 'Your Fitness Journey, 24/7',
    icon: Dumbbell,
    color: '#DC2626',
    gradient: 'from-red-100 to-red-100',
    borderClass: 'border-red-200',
    labelBorder: 'border-red-200',
    labelBg: 'bg-red-50/80',
  },
  {
    name: 'SN Property Development',
    tagline: 'Building the Future, One Structure at a Time',
    icon: HardHat,
    color: '#059669',
    gradient: 'from-emerald-100 to-emerald-100',
    borderClass: 'border-emerald-200',
    labelBorder: 'border-emerald-200',
    labelBg: 'bg-emerald-50/80',
  },
] as const;

export function HeroSection(): ReactNode {
  return (
    <section className="relative overflow-x-clip bg-white pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24">
     

      <div className="section-max section-padding relative">
        <div className="grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-12">
          {/* Left Column — Text */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              Building <AnimatedHeadline />,{' '}
              <span className="text-amber-600">Empowering Lives</span>
            </h1>
            <p className="mt-4 max-w-sm text-base text-zinc-500">
              A diversified conglomerate committed to excellence across food
              service, healthcare, fitness, and construction.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/businesses" variant="primary" size="lg">
                Explore Our Businesses
              </CTAButton>
              <CTAButton href="/careers" variant="outline" size="lg">
                View Careers
              </CTAButton>
            </div>
          </div>

          {/* Right Column — CardSwap */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative h-[460px] w-full -translate-y-24">
              <CardSwap
                width={520}
                height={300}
                cardDistance={55}
                verticalDistance={60}
                delay={4000}
                pauseOnHover
                skewAmount={4}
                easing="elastic"
                onCardClick={() => {}}
              >
                {BUSINESSES.map((biz) => {
                  const Icon = biz.icon;
                  return (
                    <Card
                      key={biz.name}
                      customClass={`!bg-gradient-to-br ${biz.gradient} !${biz.borderClass} shadow-card`}
                    >
                      <div className="flex h-full flex-col justify-between p-6">
                        {/* Top label bar */}
                        <div className={`flex items-center gap-2.5 rounded-lg border ${biz.labelBorder} ${biz.labelBg} px-4 py-2.5 backdrop-blur-sm`}>
                          <Icon className="h-4 w-4 shrink-0" style={{ color: biz.color }} />
                          <span className="text-sm font-semibold text-zinc-900">{biz.name}</span>
                        </div>

                        {/* Bottom content */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            SN International
                          </p>
                          <p className="mt-1 text-lg font-medium leading-snug text-zinc-700">
                            {biz.tagline}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </CardSwap>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Strip — dark variant */}
      <SocialProofStrip />
    </section>
  );
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function WhatsNewMarquee(): ReactNode {
  const items = [...WHATS_NEW, ...WHATS_NEW];

  return (
    <section className="relative flex items-center border-y border-zinc-100 bg-white py-3">
      {/* Pinned "What's New" label */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 bg-white pl-5 pr-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          What&apos;s New
        </span>
        <div className="h-4 w-px bg-zinc-200" aria-hidden="true" />
      </div>

      {/* Scrolling ticker */}
      <div className="group relative flex-1 overflow-hidden">
        {/* Left edge fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-white to-transparent"
          aria-hidden="true"
        />
        {/* Right edge fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-white to-transparent"
          aria-hidden="true"
        />

        <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          {items.map((item, i) => (
            <Link
              key={`${item.text}-${i}`}
              href={item.href}
              className="inline-flex items-center gap-2 transition-colors hover:text-zinc-900"
            >
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: item.categoryColor }}
              >
                {item.category}
              </span>
              <span className="text-sm text-zinc-600">
                {item.text}
              </span>
              <span className="text-xs text-zinc-400">
                {formatDaysAgo(item.daysAgo)}
              </span>
              <span className="mx-5 select-none text-zinc-300" aria-hidden="true">
                ·
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
