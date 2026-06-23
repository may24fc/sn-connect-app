'use client';

import { motion } from 'framer-motion';

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

export default function VisionSection() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden rounded-b-[2rem]"
      id="vision-section"
    >
      <div className="w-full px-12 md:px-[4.5rem] lg:px-[5.5rem] pt-4 md:pt-8 pb-16 md:pb-[124px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr]">
          {/* ── Left sidebar ── */}
          <aside className="md:pr-4 pt-0 md:pt-12 pb-8 md:pb-0">
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
                  Our Vision
                </span>
              </motion.div>
            </motion.div>
          </aside>

          {/* ── Right content ── */}
          <aside className="pt-0 md:pt-12 flex flex-col gap-8 md:gap-10">
            {/* Heading — two lines staggered */}
            <motion.h2
              className="text-4xl sm:text-5xl md:text-[76px] font-normal leading-[1.06] tracking-tight"
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <div className="overflow-hidden pb-[0.04em]">
                <motion.span className="block" variants={line}>
                  The operating partner
                </motion.span>
              </div>
              <div className="overflow-hidden pb-[0.04em]">
                <motion.span className="block text-[#0c1d2e]/30" variants={line}>
                  behind your team.
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
                  className="max-w-3xl text-base md:text-lg text-[#0c1d2e]/65 tracking-[-0.04em]"
                  style={{ lineHeight: '1.35' }}
                >
                  We're building toward a future where remote support is as dependable as any
                  in-house hire. For founders, operators, and modern service businesses — we aim to
                  be the trusted partner behind high-performing teams, bringing the structure, the
                  people, and the process that make remote work reliable.
                </motion.p>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </section>
  );
}
