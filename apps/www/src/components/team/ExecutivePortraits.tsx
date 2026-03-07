'use client';

import type { ReactNode } from 'react';
import { Linkedin, Mail, User } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Executive {
  name: string;
  title: string;
  bio: string;
  image?: string;
  linkedin?: string;
  email?: string;
}

interface ExecutivePortraitsProps {
  executives: Executive[];
}

export function ExecutivePortraits({ executives }: ExecutivePortraitsProps): ReactNode {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {executives.map((person, i) => (
        <ScrollReveal key={person.name} delay={i * 0.15}>
          <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-card transition-shadow hover:shadow-mega sm:flex-row sm:text-left sm:items-start sm:gap-6">
            {/* Portrait placeholder */}
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-zinc-100">
              <User className="h-12 w-12 text-zinc-300" />
            </div>

            <div className="mt-4 sm:mt-0">
              <h3 className="text-lg font-bold text-zinc-900">{person.name}</h3>
              <p className="text-sm font-medium text-indigo-600">{person.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{person.bio}</p>

              <div className="mt-3 flex gap-3 justify-center sm:justify-start">
                {person.linkedin && (
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-indigo-600 transition-colors"
                    aria-label={`${person.name} LinkedIn`}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="text-zinc-400 hover:text-indigo-600 transition-colors"
                    aria-label={`Email ${person.name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
