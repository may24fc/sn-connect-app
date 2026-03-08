import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BUSINESS_UNITS, slugify } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CTAButton } from '@/components/shared/CTAButton';
import { InquiryForm } from '@/components/businesses/InquiryForm';

interface PageProps {
  params: Promise<{ slug: string; projectSlug: string }>;
}

export function generateStaticParams() {
  return BUSINESS_UNITS.flatMap((unit) =>
    unit.services.slice(0, 3).map((service) => ({
      slug: unit.slug,
      projectSlug: slugify(service.title),
    }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectSlug } = await params;
  const unit = BUSINESS_UNITS.find((u) => u.slug === slug);
  if (!unit) return { title: 'Not Found' };

  const service = unit.services.find((s) => slugify(s.title) === projectSlug);
  if (!service) return { title: 'Not Found' };

  return {
    title: `${service.title} — ${unit.name}`,
    description: service.description,
  };
}

/**
 * Generic highlights derived from the service description — split on commas / semicolons
 * so we can render a bullet list even without explicit structured data.
 */
function deriveHighlights(description: string): string[] {
  const parts = description
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  // If the description doesn't break nicely, fall back to 3 generic bullets
  if (parts.length < 2) {
    return [
      'Delivered on schedule and within budget',
      'Tailored to client requirements',
      'Backed by our quality assurance process',
    ];
  }
  return parts;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug, projectSlug } = await params;

  const unit = BUSINESS_UNITS.find((u) => u.slug === slug);
  if (!unit) notFound();

  const serviceIndex = unit.services.findIndex((s) => slugify(s.title) === projectSlug);
  if (serviceIndex === -1) notFound();

  const service = unit.services[serviceIndex]!;

  // Sibling projects (other first-3 services from this business unit)
  const relatedProjects = unit.services
    .slice(0, 3)
    .filter((_, i) => i !== serviceIndex)
    .slice(0, 2);

  const highlights = deriveHighlights(service.description);
  const Icon = unit.icon;

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-[60vh] overflow-hidden">
        {/* Background image */}
        {service.image && (
          <Image
            src={service.image}
            alt={service.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Dark + color overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/80 via-zinc-900/70 to-zinc-900/60" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: unit.color }}
        />

        <div className="section-max section-padding relative flex flex-col justify-end py-24 lg:py-32">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/60">
            <Link
              href="/businesses"
              className="hover:text-white transition-colors"
            >
              Businesses
            </Link>
            <span>/</span>
            <Link
              href={`/businesses/${unit.slug}`}
              className="hover:text-white transition-colors"
            >
              {unit.name}
            </Link>
            <span>/</span>
            <span className="text-white/90">{service.title}</span>
          </nav>

          {/* Business badge */}
          <div className="mb-4 flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${unit.color}30` }}
            >
              <Icon className="h-4 w-4" style={{ color: unit.color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: unit.color }}>
              {unit.name}
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {service.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75 leading-relaxed">
            {service.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <CTAButton href={`mailto:${unit.contact.email}`} size="lg">
              Start a Conversation
            </CTAButton>
            <Link
              href={`/businesses/${unit.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to {unit.name}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Overview ─── */}
      <section className="bg-white py-16">
        <div className="section-max section-padding">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            {/* Left: description */}
            <ScrollReveal>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: unit.color }}
              >
                Project Overview
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
                About this project
              </h2>
              <p className="mt-4 text-zinc-600 leading-relaxed">
                {service.description}
              </p>
              <p className="mt-4 text-zinc-600 leading-relaxed">
                As part of <strong>{unit.name}</strong>&apos;s commitment to{' '}
                {unit.tagline.toLowerCase()}, this initiative exemplifies the
                quality and dedication that defines everything we do. Our team
                works closely with each client to ensure outcomes that exceed
                expectations.
              </p>
            </ScrollReveal>

            {/* Right: highlights */}
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-8">
                <h3 className="text-lg font-semibold text-zinc-900">
                  Key Highlights
                </h3>
                <ul className="mt-4 space-y-3">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0"
                        style={{ color: unit.color }}
                      />
                      <span className="text-sm text-zinc-700 leading-relaxed capitalize">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Stats from the parent business */}
                {unit.stats.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-200 pt-6">
                    {unit.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-2xl font-bold text-zinc-900">
                          {stat.value}
                        </p>
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Full-width image strip ─── */}
      {service.image && (
        <section className="relative h-72 overflow-hidden sm:h-96 lg:h-[28rem]">
          <Image
            src={service.image}
            alt={service.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/40 to-transparent" />
        </section>
      )}

      {/* ─── Related Projects ─── */}
      {relatedProjects.length > 0 && (
        <section className="bg-zinc-50 py-16">
          <div className="section-max section-padding">
            <SectionHeading
              title="More from This Business"
              subtitle={`Other projects and services offered by ${unit.name}.`}
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {relatedProjects.map((proj, i) => (
                <ScrollReveal key={proj.title} delay={i * 0.1}>
                  <Link
                    href={`/businesses/${unit.slug}/projects/${slugify(proj.title)}`}
                    className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card transition-all hover:shadow-mega hover:-translate-y-1"
                  >
                    {/* Card image */}
                    <div className="relative h-44 w-full overflow-hidden">
                      {proj.image ? (
                        <Image
                          src={proj.image}
                          alt={proj.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ backgroundColor: `${unit.color}20` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <span
                        className="absolute bottom-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm"
                        style={{ backgroundColor: `${unit.color}dd`, color: '#fff' }}
                      >
                        Case Study
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                        {proj.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed line-clamp-2">
                        {proj.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-sm font-medium text-indigo-600">
                        Learn More{' '}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section
        className="relative overflow-hidden py-20"
        style={{
          background: `linear-gradient(135deg, ${unit.color}08 0%, ${unit.color}18 100%)`,
        }}
      >
        <div className="section-max section-padding relative text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Interested in{' '}
              <span style={{ color: unit.color }}>{service.title}</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
              Reach out to the {unit.name} team to learn how we can bring this
              expertise to your next project.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <CTAButton href={`mailto:${unit.contact.email}`} size="lg">
                Get in Touch
              </CTAButton>
              <a
                href={`tel:${unit.contact.phone}`}
                className="text-sm font-semibold text-zinc-600 hover:text-indigo-600 transition-colors"
              >
                Or call {unit.contact.phone}
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
