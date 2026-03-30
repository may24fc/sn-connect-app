import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { BusinessPortfolio } from '@/components/businesses/BusinessPortfolio';
import { HIDE_EXPANSION_SECTIONS } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Our Businesses',
  description:
    'Explore the diversified portfolio of SN International Group — spanning food services, healthcare products, fitness, and construction.',
};

export default function BusinessesPage() {
  if (HIDE_EXPANSION_SECTIONS) {
    notFound();
  }

  return (
    <>
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Our <span className="text-amber-600">Businesses</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            A diversified portfolio united by a commitment to excellence, innovation, and community impact.
          </p>
        </div>
      </section>

      <section className="section-max section-padding py-20">
        <SectionHeading
          title="Our Portfolio"
          subtitle="Each business unit operates with autonomy while sharing the values, resources, and vision of SN International Group."
        />

        <BusinessPortfolio />
      </section>
    </>
  );
}
