'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface TeamMember {
  name: string;
  title: string;
  department: string;
  image?: string;
}

interface TeamGridProps {
  members: TeamMember[];
}

const DEPT_BADGE: Record<string, string> = {
  SFO: 'bg-amber-50 text-amber-700 border-amber-200',
  UHP: 'bg-blue-50 text-blue-700 border-blue-200',
  '24 Fit Club': 'bg-rose-50 text-rose-700 border-rose-200',
  'SN Construction': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Corporate: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const DEFAULT_BADGE = 'bg-zinc-50 text-zinc-600 border-zinc-200';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamGrid({ members }: TeamGridProps): ReactNode {
  const [activeFilter, setActiveFilter] = useState('All');

  const departments = useMemo(() => {
    const depts = Array.from(new Set(members.map((m) => m.department)));
    return ['All', ...depts];
  }, [members]);

  const filtered = useMemo(
    () =>
      activeFilter === 'All'
        ? members
        : members.filter((m) => m.department === activeFilter),
    [members, activeFilter],
  );

  return (
    <div>
      {/* Department filter tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {departments.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => setActiveFilter(dept)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeFilter === dept
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((member) => {
            const badge = DEPT_BADGE[member.department] ?? DEFAULT_BADGE;
            return (
              <motion.article
                key={member.name}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card hover:shadow-mega"
              >
                {/* Brand accent bar */}
                <div className="h-1 w-full bg-indigo-600 transition-all duration-300 group-hover:h-1.5" />

                <div className="flex flex-col items-center px-4 pb-5 pt-5">
                  {/* Initials avatar */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-indigo-50 text-base font-bold text-indigo-600 shadow-sm">
                    {getInitials(member.name)}
                  </div>

                  <h3 className="mt-3 text-center text-sm font-bold leading-snug text-zinc-900">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-center text-xs leading-tight text-zinc-500">
                    {member.title}
                  </p>

                  {/* Dept badge */}
                  <span
                    className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge}`}
                  >
                    {member.department}
                  </span>
                </div>
              </motion.article>
            );
          })}

          {/* Join Our Team CTA card */}
          <motion.div
            layout
            key="join-cta"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
          >
            <Link
              href="/careers"
              className="group flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-card"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-transform duration-300 group-hover:scale-110">
                <ArrowRight className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-indigo-700">
                Join Our Team
              </h3>
              <p className="mt-1 text-xs text-indigo-500">
                Explore open positions
              </p>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
