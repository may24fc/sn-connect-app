import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MissionVision } from '@/components/about/MissionVision';
import { CEOMessage } from '@/components/about/CEOMessage';
import { CompanyTimeline } from '@/components/about/CompanyTimeline';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${COMPANY.name} — our mission, vision, and the leadership driving our growth across the Philippines.`,
};

export default function AboutPage(): ReactNode {
  return (
    <>
      {/* Hero — fixed: added h1 tag for accessibility */}
      <section className="bg-white py-20 lg:py-28">
        <div className="section-max section-padding text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5">
            <span className="text-sm font-semibold text-indigo-600">Est. 2010</span>
            <span className="h-1 w-1 rounded-full bg-indigo-400" />
            <span className="text-sm text-indigo-500">15+ Years of Excellence</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            About <span className="text-indigo-600">Us</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            {COMPANY.description}
          </p>
        </div>
      </section>

      <MissionVision />
      <CEOMessage />
      <CompanyTimeline />
    </>
  );
}
