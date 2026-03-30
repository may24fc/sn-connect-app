'use client';

import type { ReactNode } from 'react';
import { TestimonialsColumn, type Testimonial } from '@/components/ui/testimonials-columns';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { BUSINESS_UNITS } from '@/data/placeholder';

/**
 * Build the testimonials list from all business units, enriching each
 * with a portrait placeholder and the BU badge data.
 */
function buildTestimonials(): Testimonial[] {
  const portraits = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&q=80&auto=format&fit=crop&crop=face',
  ];

  let idx = 0;
  const all: Testimonial[] = [];

  for (const bu of BUSINESS_UNITS) {
    for (const t of bu.testimonials) {
      all.push({
        text: t.quote,
        name: t.name,
        role: t.role,
        image: portraits[idx % portraits.length]!,
        unit: bu.name,
        unitColor: bu.color,
      });
      idx++;
    }
  }

  return all;
}

const allTestimonials = buildTestimonials();

const firstColumn = allTestimonials.slice(0, 3);
const secondColumn = allTestimonials.slice(3, 6);
const thirdColumn = allTestimonials.slice(6);

export function Testimonials(): ReactNode {
  return (
    <section className="bg-primary-50/60 py-20 lg:py-28">
      <div className="section-max section-padding">
        {/* Section heading */}
        <ScrollReveal>
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <span className="inline-block rounded-md border border-accent-300 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary-900">
              Client feedback
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              What clients value most
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-500">
              Founders and operators trust SN for support that feels embedded, accountable, and easier to scale than ad hoc hiring.
            </p>
          </div>
        </ScrollReveal>

        {/* Scrolling columns */}
        <div className="mt-14 flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>
    </section>
  );
}
