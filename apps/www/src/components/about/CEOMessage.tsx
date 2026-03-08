'use client';

import type { ReactNode } from 'react';
import { Quote } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CEO_MESSAGE } from '@/data/placeholder';

export function CEOMessage(): ReactNode {
  return (
    <section className="bg-zinc-50 py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            {/* Letter container */}
            <div className="relative rounded-2xl border border-zinc-200 bg-white p-8 shadow-card sm:p-12">
              {/* Decorative quote */}
              <Quote className="absolute right-8 top-8 h-12 w-12 text-indigo-100 sm:right-12 sm:top-12" />

              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                A Message from Our CEO
              </h2>
              <div className="mt-2 h-1 w-16 rounded-full bg-indigo-600" />

              <div className="mt-8 space-y-4 text-zinc-700 leading-relaxed">
                {CEO_MESSAGE.message.split('\n\n').map((paragraph, i) => (
                  <p key={`p-${i}`}>{paragraph}</p>
                ))}
              </div>

              {/* Handwritten-style signature */}
              <p className="mt-8 font-serif text-2xl italic text-zinc-800">
                {CEO_MESSAGE.name}
              </p>

              {/* Signature area */}
              <div className="mt-6 border-t border-zinc-200 pt-6">
                <div className="flex items-center gap-4">
                  {/* Styled portrait with gradient initials */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
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
                    <p className="text-sm text-indigo-600">
                      SN International Group
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
