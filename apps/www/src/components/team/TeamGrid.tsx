'use client';

import { useState, useMemo, useRef, type ReactNode, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MemberCell({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
      transition={{
        duration: 0.55,
        delay: (index % 4) * 0.08,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group"
    >
      {/* Square portrait */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50">
            <span className="text-5xl font-black tracking-tighter text-zinc-200 select-none">
              {getInitials(member.name)}
            </span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-3.5">
        <h3 className="text-sm font-bold text-zinc-900 transition-colors duration-200 group-hover:text-amber-600 leading-snug">
          {member.name}
        </h3>
        <p className="mt-0.5 text-xs font-normal text-zinc-500 leading-snug">
          {member.title}
        </p>
        {/* Business unit with vertical accent divider */}
        <div className="mt-2 flex items-center gap-2">
          <span className="block h-3.5 w-0.5 shrink-0 bg-slate-900" aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
            {member.department}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function TeamGrid({ members }: TeamGridProps): ReactNode {
  const [activeFilter, setActiveFilter] = useState('All');
  const underlineId = useId();

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
      {/* Filter bar — underline style */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-zinc-200">
        {departments.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => setActiveFilter(dept)}
            className={`relative pb-3 text-sm font-medium transition-colors duration-200 ${
              activeFilter === dept
                ? 'text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {dept}
            <AnimatePresence>
              {activeFilter === dept && (
                <motion.span
                  layoutId={underlineId}
                  className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-900"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((member, i) => (
            <MemberCell key={member.name} member={member} index={i} />
          ))}

          {/* Join Our Team CTA cell */}
          <motion.div
            key="join-cta"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="group"
          >
            <Link href="/careers" className="block">
              {/* Dashed square */}
              <div className="relative aspect-square w-full border border-dashed border-zinc-300 transition-colors duration-300 group-hover:border-amber-400 flex items-center justify-center bg-transparent">
                <ArrowRight className="h-5 w-5 text-zinc-300 transition-colors duration-300 group-hover:text-amber-500" />
              </div>
              <div className="mt-3.5">
                <h3 className="text-sm font-bold text-zinc-400 transition-colors duration-200 group-hover:text-amber-600 leading-snug">
                  Join Our Team
                </h3>
                <p className="mt-0.5 text-xs font-normal text-zinc-400 leading-snug">
                  Explore open positions
                </p>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
