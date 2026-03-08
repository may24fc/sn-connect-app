import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, ArrowRight, Quote } from 'lucide-react';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ServicesGrid } from '@/components/businesses/ServicesGrid';
import { InquiryForm } from '@/components/businesses/InquiryForm';
import { CTAButton } from '@/components/shared/CTAButton';

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

/** Generate stable initials for testimonial avatars */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Deterministic avatar color from name */
const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-purple-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] as string;
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const unit = BUSINESS_UNITS.find((u) => u.slug === slug);

  if (!unit) notFound();

  const Icon = unit.icon;

  return (
    <>
      {/* ─── Hero Banner ─── */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <Image
          src={unit.image}
          alt={unit.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* White gradient overlay — keeps text readable */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/88 to-white/75" />
        {/* Subtle color tint */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundColor: unit.color }}
        />
        {/* Decorative dot-grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="section-max section-padding relative py-20 lg:py-28">
          <Link
            href="/businesses"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Businesses
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
            {/* Icon */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: `${unit.color}18` }}
            >
              <Icon className="h-10 w-10" style={{ color: unit.color }} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: unit.color }}>
                {unit.tagline}
              </p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                {unit.name}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-zinc-600">
                {unit.description}
              </p>
            </div>
          </div>

          {/* Key stats */}
          {unit.stats.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-6">
              {unit.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/60 bg-white/70 px-6 py-4 shadow-card backdrop-blur-sm"
                >
                  <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Trusted Partners ─── */}
      <section className="border-y border-zinc-100 bg-zinc-50/50 py-10">
        <div className="section-max section-padding">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Trusted by leading organizations
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['Metro Manila Corp', 'PhilHealth Partners', 'Ayala Group', 'SM Investments', 'JG Summit'].map(
              (name) => (
                <span
                  key={name}
                  className="text-sm font-semibold tracking-wide text-zinc-300 transition-colors hover:text-zinc-500"
                >
                  {name}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─── Services — sticky left / scrollable right ─── */}
      <section className="bg-white py-16">
        <div className="section-max section-padding">
          <ServicesGrid
            services={unit.services}
            businessName={unit.name}
            subtitle={`What ${unit.name} offers`}
          />
        </div>
      </section>

      {/* ─── Key Projects / Case Studies ─── */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <SectionHeading
            title="Key Projects"
            subtitle="Selected work showcasing our expertise and impact."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {unit.services.slice(0, 3).map((service, i) => (
              <ScrollReveal key={service.title} delay={i * 0.1}>
                <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card transition-all hover:shadow-mega">
                  {/* Color band */}
                  <div
                    className="h-2 transition-all duration-300 group-hover:h-3"
                    style={{ backgroundColor: unit.color }}
                  />
                  <div className="p-6">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${unit.color}15`, color: unit.color }}
                    >
                      Case Study
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      {service.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials (enhanced) ─── */}
      {unit.testimonials.length > 0 && (
        <section className="bg-white py-16">
          <div className="section-max section-padding">
            <SectionHeading
              title="What Our Clients Say"
              subtitle="Trusted by businesses and individuals across the Philippines."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {unit.testimonials.map((t, i) => (
                <ScrollReveal key={t.name} delay={i * 0.15}>
                  <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-card transition-all hover:shadow-mega">
                    <Quote className="absolute right-4 top-4 h-8 w-8 text-zinc-100" />
                    {/* Star rating */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-zinc-700 italic leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4">
                      {/* Avatar */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${avatarColor(t.name)}`}
                      >
                        {getInitials(t.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">{t.name}</p>
                        <p className="text-sm text-zinc-500">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Section ─── */}
      <section
        className="relative overflow-hidden py-20"
        style={{
          background: `linear-gradient(135deg, ${unit.color}08 0%, ${unit.color}18 100%)`,
        }}
      >
        <div className="section-max section-padding relative text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Ready to work with{' '}
              <span style={{ color: unit.color }}>{unit.name}</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
              Get in touch to discuss your needs and discover how we can help you achieve your goals.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <CTAButton href={`mailto:${unit.contact.email}`}>
                Contact Us
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
