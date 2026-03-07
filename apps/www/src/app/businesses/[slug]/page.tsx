import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ServicesGrid } from '@/components/businesses/ServicesGrid';
import { Testimonials } from '@/components/businesses/Testimonials';
import { InquiryForm } from '@/components/businesses/InquiryForm';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BUSINESS_UNITS.map((unit) => ({ slug: unit.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const unit = BUSINESS_UNITS.find((u) => u.slug === slug);
  if (!unit) return { title: 'Not Found' };

  return {
    title: unit.name,
    description: unit.description,
  };
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const unit = BUSINESS_UNITS.find((u) => u.slug === slug);

  if (!unit) notFound();

  const Icon = unit.icon;

  return (
    <>
      {/* Hero */}
      <section className="relative bg-white py-24">
        <div className="section-max section-padding relative">
          <Link
            href="/businesses"
            className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-indigo-600 transition-colors"
          >
            &larr; All Businesses
          </Link>

          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${unit.color}20` }}
            >
              <Icon className="h-8 w-8" color={unit.color} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
                {unit.name}
              </h1>
              <p className="mt-1 text-lg" style={{ color: unit.color }}>
                {unit.tagline}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading title="About" />
            <p className="mt-6 text-lg leading-relaxed text-zinc-600">{unit.description}</p>
          </div>
        </ScrollReveal>
      </section>

      {/* Services */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <SectionHeading
            title="Our Services"
            subtitle={`What ${unit.name} offers`}
          />
          <div className="mt-10">
            <ServicesGrid services={unit.services} />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {unit.testimonials.length > 0 && (
        <section className="section-max section-padding py-16">
          <SectionHeading
            title="What Our Clients Say"
            subtitle="Trusted by businesses and individuals across the Philippines."
          />
          <div className="mt-10">
            <Testimonials testimonials={unit.testimonials} />
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding text-center">
          <ScrollReveal>
            <SectionHeading title="Get in Touch" />
            <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <a
                href={`mailto:${unit.contact.email}`}
                className="text-zinc-600 hover:text-indigo-600 transition-colors"
              >
                {unit.contact.email}
              </a>
              <a
                href={`tel:${unit.contact.phone}`}
                className="text-zinc-600 hover:text-indigo-600 transition-colors"
              >
                {unit.contact.phone}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Floating inquiry form */}
      <InquiryForm businessName={unit.name} />
    </>
  );
}
