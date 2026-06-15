'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { BUSINESS_UNITS } from '@/data/placeholder';
import SplitCTA from '../../ui/SplitCTA';

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

interface AccordionItemProps {
  title: string;
  type: string;
  description: string;
  responsibilities: string[];
  contactHref: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({
  title,
  type,
  description,
  responsibilities,
  contactHref,
  index,
  isOpen,
  onToggle,
}: AccordionItemProps) {
  const bodyId = `service-body-${index}`;

  return (
    <div
      className="border-t border-[#0c1d2e]/12 last:border-b"
      style={{ borderColor: 'rgba(12,29,46,0.12)' }}
    >
      {/* ── Trigger row ── */}
      <button
        type="button"
        className="group w-full flex items-center justify-between gap-4
                   py-5 md:py-6 text-left transition-colors duration-200
                   hover:text-[#0c1d2e]"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="text-base md:text-lg font-normal text-[#0c1d2e] tracking-[-0.01em]">
          {title}
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="button-mono text-xs font-medium uppercase tracking-[0.15em] text-[#0c1d2e]/45">
            {type}
          </span>
          {/* Plus / minus morphing icon */}
          <span
            className="relative flex h-5 w-5 items-center justify-center"
            aria-hidden
          >
            <span className="block h-px w-4 bg-current text-[#0c1d2e]/50 transition-all duration-300" />
            <span
              className="absolute block h-4 w-px bg-current text-[#0c1d2e]/50 transition-all duration-300 origin-center"
              style={{ transform: isOpen ? 'scaleY(0)' : 'scaleY(1)' }}
            />
          </span>
        </span>
      </button>

      {/* ── Expandable body ── */}
      <div
        id={bodyId}
        className="grid transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="pb-8 pr-2">
            <p className="text-sm md:text-base text-[#0c1d2e]/60 leading-relaxed max-w-2xl">
              {description}
            </p>

            {responsibilities.length > 0 && (
              <ul className="mt-5 flex flex-col gap-2">
                {responsibilities.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2.5 text-sm text-[#0c1d2e]/55"
                  >
                    <span className="mt-[5px] shrink-0 h-1.5 w-1.5 rounded-full bg-[#3b86d2]" />
                    {r}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7">
              <div
                style={
                  {
                    '--btn-main-bg': '#0c1d2e',
                    '--btn-arrow-bg': '#3b86d2',
                  } as React.CSSProperties
                }
              >
                <SplitCTA title="REQUEST THIS SERVICE" href={contactHref} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkWithUs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <section
      className="w-full bg-[#f5f5f2]"
      ref={ref}
      id="work-with-us"
      aria-label="Work with us — services"
    >
      <div
        className="w-full max-w-[1440px] mx-auto
                   grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr]
                   gap-0 md:gap-12
                   px-6 sm:px-10 md:px-12 lg:px-16
                   py-16 md:py-24 lg:py-32"
      >
        {/* ── Sidebar label ── */}
        <motion.aside
          className="mb-10 md:mb-0 pt-1"
          variants={fade}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <span className="button-mono text-xs font-medium uppercase tracking-[0.2em] text-[#0c1d2e]/40">
            Services
          </span>
        </motion.aside>

        {/* ── Main content ── */}
        <div>
          {/* Heading */}
          <div className="overflow-hidden pb-[0.04em]">
            <motion.h2
              className="font-normal text-[#0c1d2e] tracking-tight leading-[1.07]"
              style={{ fontSize: 'clamp(26px, 3.5vw, 56px)' }}
              initial={{ y: '110%' }}
              animate={{ y: inView ? 0 : '110%' }}
              transition={{ duration: 1.0, delay: 0.05, ease }}
            >
              We match the right people
              <br />
              to your workflow.{' '}
              <span className="text-[#0c1d2e]/30">Work with us.</span>
            </motion.h2>
          </div>

          {/* Subtext */}
          <motion.p
            className="mt-6 md:mt-8 max-w-2xl text-sm sm:text-base md:text-lg text-[#0c1d2e]/55 leading-relaxed"
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            transition={{ delay: 0.2 }}
          >
            We're always scoping support roles for founders, operators, and
            growing teams. If you need help with delegation, execution, or
            scaling, we&apos;d love to{' '}
            <a
              href="mailto:info@sngroup.com.au"
              className="underline underline-offset-2 text-[#0c1d2e]/70 hover:text-[#0c1d2e] transition-colors"
            >
              hear from you
            </a>
            .
          </motion.p>

          {/* Accordion list */}
          <motion.div
            className="mt-10 md:mt-12"
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            transition={{ delay: 0.3 }}
          >
            {BUSINESS_UNITS.map((unit, i) => (
              <AccordionItem
                key={unit.slug}
                index={i}
                title={unit.name}
                type="Remote"
                description={unit.description}
                responsibilities={unit.services.map((s) => s.title)}
                contactHref={unit.website_url ?? `/contact?service=${unit.slug}`}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
