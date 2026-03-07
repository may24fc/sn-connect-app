import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { MissionVision } from '@/components/about/MissionVision';
import { CEOMessage } from '@/components/about/CEOMessage';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${COMPANY.name} — our mission, vision, and the leadership driving our growth across the Philippines.`,
};

export default function AboutPage(): ReactNode {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-20 lg:py-28">
        <div className="section-max section-padding text-center">
          <SectionHeading
            title="About Us"
            subtitle={COMPANY.description}
          />
        </div>
      </section>

      <MissionVision />
      <CEOMessage />
    </>
  );
}
