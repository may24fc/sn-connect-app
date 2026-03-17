import type { Metadata } from 'next';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { JobListings } from '@/components/careers/JobListings';
import { ApplicationForm } from '@/components/careers/ApplicationForm';
import { WhyCarousel } from '@/components/careers/WhyCarousel';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join the SN International Group team. Explore open positions across food services, healthcare, fitness, and construction.',
};

export default function CareersPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Build Your <span className="text-amber-600">Career</span> With Us
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Join a team passionate about excellence. We&apos;re always looking for talented individuals to help us grow.
          </p>
        </div>
      </section>

      {/* Why join us */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <WhyCarousel />
        </div>
      </section>

      {/* Job listings */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <SectionHeading
            title="Open Positions"
            subtitle="Browse our current opportunities and find your next role."
          />
          <div className="mt-10">
            <JobListings />
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="section-max section-padding py-16" id="apply">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            title="Apply Today"
            subtitle="Ready to take the next step? Submit your application below."
          />
          <div className="mt-10">
            <ApplicationForm />
          </div>
        </div>
      </section>
    </>
  );
}
