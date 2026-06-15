'use client';

import { motion } from 'framer-motion';
import { getLenis } from '../../../hooks/useSmoothScroll';

const ease = [0.19, 1, 0.22, 1] as const;

function LineReveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className="overflow-hidden pb-[0.06em]">
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

export default function ContactHero() {
  return (
    <section
      className="relative z-10 w-full bg-[#d6e4f0] flex flex-col gap-12
                 px-6 sm:px-10 md:px-12 lg:px-16
                 pt-32 sm:pt-36 md:pt-16 pb-10 md:pb-12"
      id="contact-hero"
    >
      {/* ── Top: Heading + divider ── */}
      <div>
        <h1
          className="font-normal tracking-tight text-[#0c1d2e] leading-[0.84]"
          style={{ fontSize: 'clamp(56px, 10.5vw, 152px)' }}
        >
          <LineReveal delay={0.3}>
            <span className="text-lg sm:text-xl md:text-[132px]">Contact</span>
          </LineReveal>
          <LineReveal delay={0.45}>
            <span className="text-[#0c1d2e]/30 text-lg sm:text-xl md:text-[132px]">
              SN International Group
            </span>
          </LineReveal>
        </h1>

        {/* ── Divider — constrained to content padding ── */}
        <motion.div
          className="w-full h-px bg-[#0c1d2e]/10 mt-8 md:mt-36"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.55, ease }}
          style={{ transformOrigin: 'left' }}
          aria-hidden
        />
      </div>

      {/* ── Bottom row: scroll button left · subtitle right ── */}
      <div className="flex items-start gap-8">
        {/* Scroll down button — identical sliding-panel mechanic as footer scroll-up,
            adapted for light background (dark hover fill) and arrow pointing down */}
        <motion.a
          href="#book-discovery"
          aria-label="Scroll to content"
          className="group relative w-12 h-12 rounded-lg border border-[#0c1d2e]/20
                     group-hover:border-transparent cursor-pointer shrink-0 overflow-hidden
                     transition-[border-color] duration-[750ms] delay-0 group-hover:delay-[150ms]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          onClick={(e) => {
            const target = document.getElementById('book-discovery');
            if (!target) return;
            const lenis = getLenis();
            if (lenis) {
              e.preventDefault();
              lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
            }
          }}
        >
          {/* Two-slot panel — slides DOWN on hover (hover slot starts above, enters from top) */}
          <div
            className="absolute -top-12 left-0 w-full flex flex-col
                       transition-transform duration-[750ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                       delay-0 group-hover:delay-[150ms] group-hover:translate-y-12"
          >
            {/* Slot 1 — hover: dark bg, white down-arrow (hidden above at rest, drops in on hover) */}
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
            {/* Slot 2 — default: transparent bg, muted down-arrow (visible at rest, exits downward on hover) */}
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

        {/* Subtitle — pushed to the right */}
        <motion.p
          className="ml-auto max-w-lg text-base sm:text-lg md:text-xl text-[#0c1d2e]/55 leading-relaxed text-right"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.62, ease }}
        >
          Tell us what you need to delegate. We&apos;ll help shape the right
          remote support setup for your team — fast.
        </motion.p>
      </div>
    </section>
  );
}
