'use client';

import { motion } from 'framer-motion';
import { getLenis } from '../../../hooks/useSmoothScroll';
import HeroBackdrop from '../../shared/HeroBackdrop';

const ease = [0.19, 1, 0.22, 1] as const;

function LineReveal({
  children,
  delay = 0,
  pb = 'pb-[30px]',
}: {
  children: React.ReactNode;
  delay?: number;
  pb?: string;
}) {
  return (
    <div className={`overflow-visible md:overflow-hidden ${pb}`}>
      <motion.div
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function TeamHero() {
  return (
    <section
      className="relative z-10 w-full bg-[#d6e4f0] flex flex-col gap-12
                 px-6 sm:px-10 md:px-12 lg:px-16
                 pt-32 sm:pt-36 md:pt-16 pb-10 md:pb-12"
      id="team-hero"
    >
      <HeroBackdrop variant="dots" />

      {/* ── Top: Heading + divider ── */}
      <div>
        <h1
          className="font-normal tracking-tight text-[#0c1d2e] leading-[0.84]"
        >
          <LineReveal delay={0.3} pb="pb-[6px]">
            <span className="text-[3.2rem] md:text-[132px]">Our Team</span>
          </LineReveal>
          <LineReveal delay={0.45}>
            <span className="text-[#0c1d2e]/30 text-[2.8rem] md:text-[132px]">
              SN International Group
            </span>
          </LineReveal>
        </h1>

        {/* ── Divider ── */}
        <motion.div
          className="hidden md:block w-full h-px bg-[#0c1d2e]/10 mt-8 md:mt-16"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.55, ease }}
          style={{ transformOrigin: 'left' }}
          aria-hidden
        />
      </div>

      {/* ── Bottom row: scroll button left · subtitle right ── */}
      <div className="flex items-start gap-8">
        <motion.a
          href="#team-card"
          aria-label="Scroll to content"
          className="hidden sm:block group relative w-12 h-12 rounded-lg border border-[#0c1d2e]/20
                     group-hover:border-transparent cursor-pointer shrink-0 overflow-hidden
                     transition-[border-color] duration-[750ms] delay-0 group-hover:delay-[150ms]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          onClick={(e) => {
            const target = document.getElementById('team-card');
            if (!target) return;
            const lenis = getLenis();
            if (lenis) {
              e.preventDefault();
              lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
            }
          }}
        >
          <div
            className="absolute -top-12 left-0 w-full flex flex-col
                       transition-transform duration-[750ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                       delay-0 group-hover:delay-[150ms] group-hover:translate-y-12"
          >
            {/* Slot 1 — hover: dark bg, white arrow */}
            <div className="flex items-center justify-center w-12 h-12 shrink-0 bg-[#0c1d2e] rounded-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  transform="rotate(90, 12, 12)"
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            {/* Slot 2 — default: transparent bg, muted arrow */}
            <div className="flex items-center justify-center w-12 h-12 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  transform="rotate(90, 12, 12)"
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="rgba(12,29,46,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </motion.a>

        {/* Subtitle */}
        <motion.p
          className="sm:ml-auto max-w-lg text-lg md:text-xl font-medium sm:font-normal text-[#0c1d2e]/55 leading-snug sm:leading-relaxed sm:text-right tracking-[-0.04em]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.62, ease }}
        >
          The specialists, creatives, and operators behind every engagement, brought together with purpose and built to deliver.
        </motion.p>
      </div>
    </section>
  );
}
