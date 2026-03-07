import type { Metadata } from 'next';
import { CULTURE_VALUES, LIFE_PHOTOS, COMPANY, EMPLOYEE_SPOTLIGHTS } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CultureHighlights } from '@/components/life/CultureHighlights';
import { MasonryGrid } from '@/components/life/MasonryGrid';
import { EmployeeSpotlight } from '@/components/life/EmployeeSpotlight';
import { CTAButton } from '@/components/shared/CTAButton';

export const metadata: Metadata = {
  title: 'Life at SN',
  description:
    'Discover the culture, values, and people behind SN International Group. See what makes us a great place to work.',
};

export default function LifeAtSNPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Life at <span className="text-indigo-600">{COMPANY.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            More than a workplace — a community of passionate professionals building something meaningful together.
          </p>
        </div>
      </section>

      {/* Culture values */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <SectionHeading
            title="Our Values"
            subtitle="The principles that guide everything we do."
          />
        </ScrollReveal>
        <div className="mt-10">
          <CultureHighlights values={CULTURE_VALUES} />
        </div>
      </section>

      {/* Photo grid */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Inside Our World"
              subtitle="A glimpse into our team events, workspace, and culture."
            />
          </ScrollReveal>
          <div className="mt-10">
            <MasonryGrid photos={LIFE_PHOTOS} />
          </div>
        </div>
      </section>

      {/* Employee spotlight */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <SectionHeading
            title="Employee Spotlight"
            subtitle="Hear from the people who make SN International Group special."
          />
        </ScrollReveal>

        <div className="mt-10 mx-auto max-w-3xl">
          <EmployeeSpotlight spotlights={EMPLOYEE_SPOTLIGHTS} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-zinc-900">
              Ready to Be Part of <span className="text-indigo-600">Our Story</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-500">
              We&apos;re always looking for talented, passionate people to join our team.
            </p>
            <div className="mt-8">
              <CTAButton href="/careers" variant="primary" size="lg">
                View Open Positions
              </CTAButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
