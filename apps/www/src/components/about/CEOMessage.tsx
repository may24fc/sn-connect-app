'use client';

import type { ReactNode } from 'react';
import { Quote } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CEO_MESSAGE } from '@/data/placeholder';

export function CEOMessage(): ReactNode {
  return (
    <section className="bg-[linear-gradient(180deg,rgba(96,153,172,0.08),rgba(255,255,255,0)_100%)] py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-[2rem] border border-primary-100 bg-white p-8 shadow-card sm:p-12">
              <Quote className="absolute right-8 top-8 h-12 w-12 text-primary-200 sm:right-12 sm:top-12" />

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-800">
                Founder Note
              </p>

              <h2 className="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">
                A Message from Our CEO
              </h2>
              <div className="mt-2 h-1 w-16 rounded-full bg-primary-800" />

              <div className="mt-8 space-y-4 leading-relaxed text-zinc-700">
                {CEO_MESSAGE.message.split('\n\n').map((paragraph, i) => (
                  <p key={`p-${i}`}>{paragraph}</p>
                ))}
              </div>

              <p className="mt-8 font-serif text-2xl italic text-zinc-800">
                {CEO_MESSAGE.name}
              </p>

              <div className="mt-6 border-t border-zinc-200 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-700 to-primary-900 shadow-md">
                    <span className="text-lg font-bold text-white">
                      {CEO_MESSAGE.initials}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">
                      {CEO_MESSAGE.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {CEO_MESSAGE.title}
                    </p>
                    <p className="text-sm text-primary-700">
                      SN International Group Pty. Ltd.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
