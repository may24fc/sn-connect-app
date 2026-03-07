import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

export const metadata: Metadata = {
  title: 'Our Businesses',
  description:
    'Explore the diversified portfolio of SN International Group — spanning food services, healthcare products, fitness, and construction.',
};

export default function BusinessesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Our <span className="text-indigo-600">Businesses</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            A diversified portfolio united by a commitment to excellence, innovation, and community impact.
          </p>
        </div>
      </section>

      {/* Business units grid */}
      <section className="section-max section-padding py-20">
        <SectionHeading
          title="Our Portfolio"
          subtitle="Each business unit operates with autonomy while sharing the values, resources, and vision of SN International Group."
        />

        <div className="mt-14 space-y-16">
          {BUSINESS_UNITS.map((unit, index) => {
            const Icon = unit.icon;
            const isEven = index % 2 === 0;

            return (
              <ScrollReveal key={unit.slug} direction={isEven ? 'left' : 'right'}>
                <div
                  className={`flex flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-card transition-shadow hover:shadow-mega lg:flex-row ${
                    !isEven ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Visual block */}
                  <div className="flex shrink-0 items-center justify-center rounded-xl bg-zinc-50 lg:w-72 lg:h-56">
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${unit.color}15` }}
                    >
                      <Icon className="h-12 w-12" color={unit.color} />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-center">
                    <h3 className="text-2xl font-bold text-zinc-900">{unit.name}</h3>
                    <p className="mt-1 text-sm font-medium" style={{ color: unit.color }}>
                      {unit.tagline}
                    </p>
                    <p className="mt-3 text-zinc-600">{unit.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {unit.services.slice(0, 3).map((s) => (
                        <span
                          key={s.title}
                          className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                        >
                          {s.title}
                        </span>
                      ))}
                      {unit.services.length > 3 && (
                        <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
                          +{unit.services.length - 3} more
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/businesses/${unit.slug}`}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Learn more &rarr;
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
