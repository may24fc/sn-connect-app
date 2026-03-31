'use client';

import { useState, useRef, type ReactNode, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { HIDE_EXPANSION_SECTIONS } from '@/lib/site-config';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowRight, Expand, X } from 'lucide-react';

interface TeamMember {
  name: string;
  title: string;
  image?: string | StaticImageData;
  department?: string;
}

interface TeamGridProps {
  staffMembers: TeamMember[];
  internMembers: TeamMember[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TeamLightbox({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  if (!member.image) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Full poster for ${member.name}`}
    >
      <div className="flex min-h-full w-full items-start justify-center px-4 py-8 md:px-12 md:py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
          className="relative"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onClose(); }}
            className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg backdrop-blur-sm transition-colors duration-200 hover:bg-white"
            aria-label="Close full poster"
          >
            <X className="h-5 w-5" />
          </button>

          <Image
            src={member.image}
            alt={`${member.name} team poster`}
            width={768}
            height={1024}
            className="w-auto max-w-[80vw] rounded-2xl object-contain shadow-2xl sm:max-w-[60vw] md:max-w-[45vw] lg:max-w-[35vw]"
            sizes="(max-width: 640px) 80vw, (max-width: 768px) 60vw, (max-width: 1024px) 45vw, 35vw"
            priority
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function MemberCell({
  member,
  index,
  onOpenImage,
}: {
  member: TeamMember;
  index: number;
  onOpenImage: (member: TeamMember) => void;
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
        delay: (index % 3) * 0.08,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group mx-auto w-full max-w-[17rem]"
    >
      <button
        type="button"
        onClick={() => onOpenImage(member)}
        className="block w-full text-left"
        aria-label={`Open full poster for ${member.name}`}
      >
        {member.image ? (
          <div className="relative overflow-hidden rounded-[24px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,rgba(96,153,172,0.12),transparent_30%),linear-gradient(180deg,#ffffff,#f8fafc)] p-2.5 shadow-[0_22px_65px_-42px_rgba(15,23,42,0.28)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_85px_-44px_rgba(15,23,42,0.36)]">
            <div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[18px] bg-zinc-50 sm:min-h-[20rem]">
              <Image
                src={member.image}
                alt={`${member.name} team poster`}
                width={768}
                height={1024}
                className="h-auto max-h-[20rem] w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.01] sm:max-h-[22rem]"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 42vw, 280px"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-zinc-950/75 via-zinc-950/15 to-transparent px-3.5 pb-3.5 pt-10 text-white opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/85">
                  View full poster
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                  <Expand className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[24px] border border-zinc-200/80 bg-gradient-to-br from-zinc-100 to-zinc-200/60 p-2.5 shadow-[0_22px_65px_-42px_rgba(15,23,42,0.28)]">
            <div className="relative flex min-h-[18rem] items-end justify-end overflow-hidden rounded-[18px] bg-zinc-100 sm:min-h-[20rem]">
              <span className="absolute -bottom-3 -right-2 select-none text-[9rem] font-black tracking-tighter text-zinc-300/70">
                {getInitials(member.name)[0]}
              </span>
            </div>
          </div>
        )}
      </button>

      {/* Metadata */}
      <div className="mt-4 px-1">
        {member.department && (
          <span className="mb-2 inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-700">
            {member.department}
          </span>
        )}
        <h3 className="text-sm font-bold leading-snug text-zinc-900 transition-colors duration-200 group-hover:text-primary-800">
          {member.name}
        </h3>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {member.title}
        </p>
      </div>
    </motion.div>
  );
}

export function TeamGrid({
  staffMembers,
  internMembers,
}: TeamGridProps): ReactNode {
  const [activeFilter, setActiveFilter] = useState<'Staffs' | 'Interns'>('Staffs');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const underlineId = useId();

  useEffect(() => {
    if (!selectedMember) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMember(null);
      }
    };

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      html.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedMember]);

  const filters: Array<'Staffs' | 'Interns'> = ['Staffs', 'Interns'];
  const filtered = activeFilter === 'Staffs' ? staffMembers : internMembers;

  return (
    <>
      <div>
        {/* Filter bar — underline style with counts */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-zinc-200">
          {filters.map((filter) => {
            const count = filter === 'Staffs' ? staffMembers.length : internMembers.length;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors duration-200 ${
                  activeFilter === filter
                    ? 'text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {filter}
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                    activeFilter === filter
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
                <AnimatePresence>
                  {activeFilter === filter && (
                    <motion.span
                      layoutId={underlineId}
                      className="absolute bottom-0 left-0 h-0.5 w-full bg-primary-800"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        <p className="mb-10 text-center text-sm text-zinc-500">
          {activeFilter === 'Staffs'
            ? 'Core staff members supporting leadership, marketing, design, HR, and operations.'
            : 'Interns contributing across AI, admin, content, HR, and marketing work.'}
        </p>

        {/* Gallery grid */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((member, i) => (
              <MemberCell
                key={member.name}
                member={member}
                index={i}
                onOpenImage={setSelectedMember}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={HIDE_EXPANSION_SECTIONS ? '/contact' : '/careers'}
            className="group inline-flex items-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:border-primary-300 hover:text-primary-800"
          >
            <span>{HIDE_EXPANSION_SECTIONS ? 'Get in Touch' : 'Join Our Team'}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      {selectedMember && createPortal(
        <AnimatePresence>
          <TeamLightbox member={selectedMember} onClose={() => setSelectedMember(null)} />
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
