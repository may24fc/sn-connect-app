'use client';

import { motion } from 'framer-motion';
import SplitCTA from '../../ui/SplitCTA';

const ease = [0.19, 1, 0.22, 1] as const;

const line = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1.0, ease } },
};

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

export default function IntegratedPlatform() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e]"
      id="integrated-platform-section"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-[#0c1d2e]/10" />

      <div className="w-full px-6 md:px-12 pt-16 md:pt-[145px] pb-16 md:pb-[124px]">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* ── Left sidebar ── */}
          <aside className="md:col-span-1 md:pr-4 pt-0 md:pt-12 pb-8 md:pb-0" id="platform-sidebar">
            <motion.div
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div
                variants={fade}
                className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2"
              >
                <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
                <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                  How We Work
                </span>
              </motion.div>
            </motion.div>
          </aside>

          {/* ── Right content ── */}
          <aside
            className="md:col-span-2 md:pl-4 pt-0 md:pt-12 flex flex-col gap-8 md:gap-10"
            id="platform-content"
          >
            {/* Heading — single line on mobile, two lines on md+ */}
            <motion.h2
              className="text-[1.75rem] sm:text-5xl md:text-[76px] font-normal leading-[1.06] tracking-tight"
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              id="platform-heading"
            >
              {/* Mobile: both sentences flow as one block, wraps naturally */}
              <div className="overflow-visible pb-[0.04em] md:hidden">
                <motion.span className="block" variants={line}>
                  Tell us what you need. <span className="text-[#0c1d2e]/30">We'll help you get there.</span>
                </motion.span>
              </div>
              {/* Desktop: two separate staggered lines */}
              <div className="hidden md:block overflow-hidden pb-[0.04em]">
                <motion.span className="block" variants={line}>
                  Tell us what you need.
                </motion.span>
              </div>
              <div className="hidden md:block overflow-hidden pb-[0.04em]">
                <motion.span className="block text-[#0c1d2e]/30" variants={line}>
                  We'll help you get there.
                </motion.span>
              </div>
            </motion.h2>

            {/* Body text */}
            <motion.div
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col gap-8 md:gap-10"
            >
              <div className="overflow-hidden">
                <motion.p
                  variants={line}
                  className="max-w-3xl text-base md:text-lg font-medium sm:font-normal text-[#0c1d2e]/65 tracking-[-0.04em]"
                  style={{ lineHeight: '1.35' }}
                >
                  Every engagement starts with understanding your goals, systems, and workflow. We
                  then match you with remote specialists who can integrate quickly and contribute
                  immediately. AI-powered processes help streamline execution, but the focus remains
                  the same: reliable people delivering meaningful work from day one.
                </motion.p>
              </div>

              <motion.div variants={fade}>
                <SplitCTA title="REQUEST A BRIEF" href="/contact" />
              </motion.div>
            </motion.div>
          </aside>
        </div>
      </div>
    </section>
  );
}
