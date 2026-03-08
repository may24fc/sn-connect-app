import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LIFE_PHOTOS } from '@/data/placeholder';
import { CTAButton } from '@/components/shared/CTAButton';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LIFE_PHOTOS.map((photo) => ({ slug: photo.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const photo = LIFE_PHOTOS.find((p) => p.slug === slug);
  if (!photo) return { title: 'Not Found' };
  return {
    title: `${photo.caption} | Life at SN`,
    description: photo.description,
  };
}

export default async function LifePhotoPage({ params }: PageProps) {
  const { slug } = await params;
  const photo = LIFE_PHOTOS.find((p) => p.slug === slug);

  if (!photo) notFound();

  const currentIndex = LIFE_PHOTOS.findIndex((p) => p.slug === slug);
  const prevPhoto = currentIndex > 0 ? LIFE_PHOTOS[currentIndex - 1] : null;
  const nextPhoto = currentIndex < LIFE_PHOTOS.length - 1 ? LIFE_PHOTOS[currentIndex + 1] : null;

  const relatedPhotos = LIFE_PHOTOS.filter(
    (p) => p.category === photo.category && p.slug !== slug,
  ).slice(0, 3);

  return (
    <>
      {/* Back nav */}
      <div className="border-b border-zinc-100 bg-white py-4">
        <div className="section-max section-padding">
          <Link
            href="/life-at-sn"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Life at SN
          </Link>
        </div>
      </div>

      {/* Hero image */}
      <section className="relative h-[60vh] overflow-hidden bg-zinc-900">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          className="object-cover opacity-75"
          priority
          sizes="100vw"
        />
        {/* Gradient so text stays legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 pb-10">
          <div className="section-max section-padding">
            <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
              {photo.category}
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {photo.caption}
            </h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16">
        <div className="section-max section-padding">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl">
              <p className="text-lg leading-relaxed text-zinc-600">{photo.description}</p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <CTAButton href="/life-at-sn" variant="outline">
                  View All Moments
                </CTAButton>
                <CTAButton href="/careers" variant="primary">
                  Join Our Team
                </CTAButton>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Prev / Next navigation */}
      {(prevPhoto || nextPhoto) && (
        <div className="border-t border-zinc-100 bg-zinc-50">
          <div className="section-max section-padding flex items-stretch divide-x divide-zinc-200">
            {prevPhoto ? (
              <Link
                href={`/life-at-sn/${prevPhoto.slug}`}
                className="group flex flex-1 items-center gap-4 py-8 pr-8 transition-colors hover:text-indigo-600"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 text-zinc-400 transition-colors group-hover:text-indigo-600" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Previous</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-zinc-800 group-hover:text-indigo-600">
                    {prevPhoto.caption}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {nextPhoto && (
              <Link
                href={`/life-at-sn/${nextPhoto.slug}`}
                className="group flex flex-1 items-center justify-end gap-4 py-8 pl-8 text-right transition-colors hover:text-indigo-600"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Next</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-zinc-800 group-hover:text-indigo-600">
                    {nextPhoto.caption}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-zinc-400 transition-colors group-hover:text-indigo-600" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Related moments */}
      {relatedPhotos.length > 0 && (
        <section className="bg-white py-16">
          <div className="section-max section-padding">
            <ScrollReveal>
              <h2 className="text-xl font-bold text-zinc-900">
                More from <span className="text-indigo-600">{photo.category}</span>
              </h2>
            </ScrollReveal>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPhotos.map((related) => (
                <ScrollReveal key={related.slug}>
                  <Link
                    href={`/life-at-sn/${related.slug}`}
                    className="group block overflow-hidden rounded-2xl bg-zinc-50 shadow-card transition-shadow hover:shadow-card-hover"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={related.src}
                        alt={related.alt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                        {related.category}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-zinc-800 transition-colors group-hover:text-indigo-600">
                        {related.caption}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{related.description}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
