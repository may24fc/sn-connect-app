import type { Metadata } from 'next';
import { CULTURE_VALUES, LIFE_PHOTOS, COMPANY } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CultureHighlights } from '@/components/life/CultureHighlights';
import { MasonryGrid } from '@/components/life/MasonryGrid';
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

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            {
              name: 'Andrea Reyes',
              role: 'Operations Lead, SFO',
              tenure: '4 years',
              quote:
                'What I love most about SN is the trust and autonomy. I was given the freedom to innovate our meal programs, and the leadership always supported me.',
            },
            {
              name: 'Marco Santos',
              role: 'Sales Manager, UHP',
              tenure: '3 years',
              quote:
                'SN invests in your growth. I started as a sales executive and within three years, I was leading a team. The opportunities here are real.',
            },
          ].map((spotlight, i) => (
            <ScrollReveal key={spotlight.name} delay={i * 0.15}>
              <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-card">
                <p className="text-zinc-600 italic leading-relaxed">
                  &ldquo;{spotlight.quote}&rdquo;
                </p>
                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <p className="font-semibold text-zinc-900">{spotlight.name}</p>
                  <p className="text-sm text-zinc-500">
                    {spotlight.role} · {spotlight.tenure}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
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
