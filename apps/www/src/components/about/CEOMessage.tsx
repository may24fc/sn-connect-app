'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { CEO_MESSAGE } from '@/data/placeholder';

export function CEOMessage(): ReactNode {
  return (
    <section className="bg-zinc-50 py-20 lg:py-28">
      <div className="section-max section-padding">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            {/* Letter container */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-card sm:p-12">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                A Message from Our CEO
              </h2>
              <div className="mt-2 h-1 w-16 rounded-full bg-indigo-600" />

              <div className="mt-8 space-y-4 text-zinc-700 leading-relaxed">
                {CEO_MESSAGE.message.split('\n\n').map((paragraph, i) => (
                  <p key={`p-${i}`}>{paragraph}</p>
                ))}
              </div>

              {/* Signature area */}
              <div className="mt-10 border-t border-zinc-200 pt-6">
                <div className="flex items-center gap-4">
                  {/* Portrait placeholder */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                    <span className="text-xl font-bold text-zinc-400">
                      CEO
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
