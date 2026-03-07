import type { Metadata } from 'next';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { JobListings } from '@/components/careers/JobListings';
import { ApplicationForm } from '@/components/careers/ApplicationForm';

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
            Build Your <span className="text-indigo-600">Career</span> With Us
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Join a team passionate about excellence. We&apos;re always looking for talented individuals to help us grow.
          </p>
        </div>
      </section>

      {/* Why join us */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <SectionHeading
            title="Why SN International Group?"
            subtitle="We invest in our people because they're the foundation of everything we build."
          />
        </ScrollReveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Growth Opportunities', desc: 'Clear career paths and cross-functional mobility across all business units.' },
            { title: 'Competitive Benefits', desc: 'Comprehensive compensation, health coverage, and performance bonuses.' },
            { title: 'Learning & Development', desc: 'Access to training programs, workshops, and mentorship opportunities.' },
            { title: 'Work-Life Balance', desc: 'Flexible arrangements, wellness programs, and team activities.' },
            { title: 'Inclusive Culture', desc: 'A diverse and supportive environment where every voice matters.' },
            { title: 'Impact & Purpose', desc: 'Work that makes a real difference in communities across the Philippines.' },
          ].map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.1}>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card">
                <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{item.desc}</p>
              </div>
            </ScrollReveal>
          ))}
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
