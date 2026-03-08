'use client';

import { type ReactNode, useState } from 'react';
import { Mail, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface Executive {
  name: string;
  title: string;
  bio: string;
  image?: string;
  email?: string;
}

interface ExecutivePortraitsProps {
  executives: Executive[];
}

/* Alternating indigo shades — unified brand palette */
const SCHEMES = [
  { panelClass: 'bg-indigo-600' },
  { panelClass: 'bg-indigo-700' },
  { panelClass: 'bg-indigo-700' },
  { panelClass: 'bg-indigo-600' },
] as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ExecutiveCard({ person, index }: { person: Executive; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const s = SCHEMES[index % SCHEMES.length]!;
  const num = String(index + 1).padStart(2, '0');

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex min-h-[220px] overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card hover:shadow-mega"
    >
      {/* Left panel — color gradient */}
      <div
        className={`relative flex w-[156px] shrink-0 flex-col items-center justify-center overflow-hidden p-6 ${s.panelClass}`}
      >
        {/* Sequential index */}
        <span className="absolute left-3 top-3 font-mono text-[10px] font-bold tracking-[0.2em] text-white/30">
          {num}
        </span>

        {/* Initials avatar with soft glow ring */}
        <div
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white"
          style={{
            boxShadow: '0 0 0 3px rgba(255,255,255,0.25), 0 0 0 7px rgba(255,255,255,0.06)',
          }}
        >
          {getInitials(person.name)}
        </div>

        {/* Dot-matrix decoration */}
        <div className="absolute bottom-4 right-3 grid grid-cols-3 gap-[5px] opacity-20">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-[3px] w-[3px] rounded-full bg-white" />
          ))}
        </div>

        {/* Corner bracket */}
        <div className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-white/20 rounded-bl-sm" />
        <div className="absolute right-3 top-8 h-px w-8 bg-white/10" />
      </div>

      {/* Right panel — content */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Role badge */}
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            {person.title}
          </span>

          <h3 className="mt-2.5 text-lg font-bold leading-tight text-zinc-900">
            {person.name}
          </h3>

          {/* Accent rule */}
          <div className="mt-2 h-0.5 w-10 rounded-full bg-indigo-600" />

          {/* Expandable bio */}
          <div className="mt-3">
            <AnimatePresence initial={false}>
              <motion.p
                className="text-sm leading-relaxed text-zinc-500"
                initial={false}
                animate={{ height: expanded ? 'auto' : '3.6em' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {person.bio}
              </motion.p>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              {expanded ? 'Show less' : 'Read more'}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Social links */}
        {person.email && (
          <div className="mt-4 flex items-center gap-2">
            <a
              href={`mailto:${person.email}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400 transition-all duration-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white"
              aria-label={`Email ${person.name}`}
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function ExecutivePortraits({ executives }: ExecutivePortraitsProps): ReactNode {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {executives.map((person, i) => (
        <ScrollReveal key={person.name} delay={i * 0.12}>
          <ExecutiveCard person={person} index={i} />
        </ScrollReveal>
      ))}
    </div>
  );
}
