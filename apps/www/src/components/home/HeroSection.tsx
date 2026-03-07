import type { ReactNode } from 'react';
import { COMPANY, WHATS_NEW } from '@/data/placeholder';
import { CTAButton } from '@/components/shared/CTAButton';

export function HeroSection(): ReactNode {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28 lg:py-36">
      <div className="section-max section-padding relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium text-indigo-600">
            {COMPANY.name}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            Building Futures,{' '}
            <span className="text-indigo-600">Empowering Lives</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-500">
            A diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton href="/businesses" variant="primary" size="lg">
              View Businesses
            </CTAButton>
            <CTAButton href="/careers" variant="outline" size="lg">
              Careers
            </CTAButton>
            <CTAButton href="/contact" variant="secondary" size="lg">
              Contact Us
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatsNewMarquee(): ReactNode {
  const items = [...WHATS_NEW, ...WHATS_NEW];

  return (
    <section className="overflow-hidden border-y border-zinc-200 bg-zinc-50 py-3">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="mx-8 inline-block text-sm text-zinc-500"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
