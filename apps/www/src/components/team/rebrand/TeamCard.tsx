'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ChromaFlow, FlutedGlass, Shader, Swirl } from 'shaders/react';

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay, ease },
  }),
};

export default function TeamCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#d6e4f0] px-4 md:px-6 pb-6 md:pb-8"
      id="team-card"
      aria-label="Our team"
    >
      <motion.div
        className="relative w-full rounded-[2rem] overflow-hidden bg-[#0c1d2e]"
        custom={0.1}
        variants={fade}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {/* ── Fluted glass background ── */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <Shader style={{ width: '100%', height: '100%' }}>
            <Swirl colorA="#0c1d2e" colorB="#1b3b5a" detail={1.7} />
            <ChromaFlow
              baseColor="#0c1d2e"
              downColor="#1b3b5a"
              leftColor="#2b5a8c"
              rightColor="#1b3b5a"
              upColor="#0c1d2e"
              momentum={13}
              radius={3.5}
            />
            <FlutedGlass
              aberration={0.61}
              angle={31}
              frequency={8}
              highlight={0.08}
              highlightSoftness={0}
              lightAngle={-90}
              refraction={4}
              shape="rounded"
              softness={1}
              speed={0.15}
            />
          </Shader>
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-0 px-8 md:px-12 lg:px-16 py-16 md:py-20">
          {/* Label — upper left */}
          <motion.div
            className="mb-6 md:mb-0 pt-1"
            custom={0.2}
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <div className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2">
              <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
              <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                The Team
              </span>
            </div>
          </motion.div>

          {/* Right: description */}
          <motion.p
            className="text-base md:text-5xl text-[#ffffff] tracking-[-0.04em] w-full"
            style={{ lineHeight: '1.15' }}
            custom={0.3}
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            A cross-functional group of remote specialists, creatives, and operators — each placed with intent, supported with structure, and focused on delivering dependable work.
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
