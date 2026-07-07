'use client';

import { motion } from 'framer-motion';
import { Building2, Layers, Users, Workflow } from 'lucide-react';

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

// Evenly distributed around the hub (percent of the square) so the diagram
// reads as a balanced system rather than a cluster. Each branch owns an icon.
const orbitNodes = [
  { label: 'The Structure', sub: 'Accountability from day one', x: 50, y: 13, Icon: Layers },
  { label: 'The People', sub: 'Vetted specialists, embedded', x: 18, y: 68, Icon: Users },
  { label: 'The Process', sub: 'AI-enabled, consistent at scale', x: 82, y: 68, Icon: Workflow },
];

const visionNotes = [
  'Remote support, as dependable as an in-house hire',
  'For founders, operators, and modern service businesses',
];

export default function VisionSection() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden rounded-b-[2rem]"
      id="vision-section"
    >
      {/* ── Background: faint dots + soft glow ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden id="vision-bg">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(12,29,46,0.08) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage:
              'radial-gradient(ellipse 100% 100% at 72% 55%, black 32%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 100% 100% at 72% 55%, black 32%, transparent 100%)',
          }}
        />
        <div className="absolute -top-32 right-[-6%] w-[460px] h-[460px] rounded-full bg-[#3b86d2]/[0.12] blur-[125px]" />
        <div className="absolute bottom-[-25%] left-[-8%] w-[400px] h-[400px] rounded-full bg-white/40 blur-[115px]" />
        <span className="hidden md:block absolute top-[14%] left-[40%] button-mono text-lg text-[#0c1d2e]/15">
          +
        </span>
      </div>

      <div className="relative w-full px-6 md:px-[4.5rem] lg:px-[5.5rem] pt-4 md:pt-8 pb-16 md:pb-[110px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] md:gap-x-6">
          {/* ── Left sidebar ── */}
          <aside className="md:pr-4 pt-0 md:pt-12 pb-8 md:pb-0">
            <motion.div
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col gap-6"
            >
              <motion.div
                variants={fade}
                className="inline-flex self-start items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2"
              >
                <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
                <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                  Our Vision
                </span>
              </motion.div>

              {/* Supporting notes — grounds the left column and balances the layout */}
              <motion.ul variants={fade} className="hidden md:flex flex-col gap-4 max-w-[260px]">
                {visionNotes.map((note) => (
                  <li key={note} className="flex gap-3 text-[#0c1d2e]/60">
                    <span className="mt-[7px] w-[6px] h-[6px] rounded-full bg-[#3b86d2] flex-shrink-0" />
                    <span className="text-[15px] leading-relaxed">{note}</span>
                  </li>
                ))}
              </motion.ul>
            </motion.div>
          </aside>

          {/* ── Right content ── */}
          <aside className="pt-0 md:pt-12 flex flex-col gap-8 md:gap-12">
            {/* Heading — two lines staggered */}
            <motion.h2
              className="font-normal leading-[1.06] tracking-tight"
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {/* Mobile: single flowing line */}
              <div className="block md:hidden overflow-visible pb-[0.04em]">
                <motion.span className="text-[1.75rem] sm:text-5xl" variants={line}>
                  The operating partner{' '}
                  <span className="text-[#0c1d2e]/30">behind your team.</span>
                </motion.span>
              </div>
              {/* Desktop: two masked lines */}
              <div className="hidden md:block">
                <div className="overflow-hidden pb-[0.3em]">
                  <motion.span className="block md:text-[76px]" variants={line}>
                    The operating partner
                  </motion.span>
                </div>
                <div className="overflow-hidden pb-[0.3em]">
                  <motion.span className="block md:text-[76px] text-[#0c1d2e]/30" variants={line}>
                    behind your team.
                  </motion.span>
                </div>
              </div>
            </motion.h2>

            {/* System map — SN as the operating layer around your business */}
            <motion.div
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {/* ── Desktop: radial hub-and-spoke ── */}
              <motion.div variants={fade} id="vision-orbit" className="hidden md:block w-full">
                <div className="relative w-full max-w-[500px] aspect-square mx-auto">
                  {/* Rings */}
                  <span
                    className="absolute inset-0 rounded-full border border-[#0c1d2e]/10"
                    aria-hidden
                  />
                  <motion.span
                    className="absolute inset-[15%] rounded-full border border-dashed border-[#0c1d2e]/[0.14]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 90, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                    aria-hidden
                  />

                  {/* Radar ping from the center */}
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32"
                    aria-hidden
                  >
                    <motion.span
                      className="absolute inset-0 rounded-full border border-[#3b86d2]/40"
                      initial={{ scale: 0.35, opacity: 0 }}
                      animate={{ scale: [0.35, 1.7], opacity: [0.7, 0] }}
                      transition={{
                        duration: 3.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeOut',
                        repeatDelay: 0.8,
                      }}
                    />
                  </span>

                  {/* Spokes — each branch drawn back to the hub */}
                  <motion.svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    fill="none"
                    aria-hidden
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                  >
                    {orbitNodes.map((node, idx) => (
                      <motion.line
                        key={node.label}
                        x1="50"
                        y1="50"
                        x2={node.x}
                        y2={node.y}
                        stroke="rgba(12,29,46,0.18)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: {
                            pathLength: 1,
                            opacity: 1,
                            transition: { duration: 0.8, delay: 0.15 + idx * 0.12, ease },
                          },
                        }}
                      />
                    ))}
                  </motion.svg>

                  {/* Center — the client's business (the anchor, largest weight) */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-3 bg-[#0c1d2e] rounded-lg pl-3 pr-5 py-3 shadow-[0_10px_30px_rgba(12,29,46,0.25)]">
                    <span className="grid place-items-center w-9 h-9 rounded-md bg-white/10 text-[#3b86d2] flex-shrink-0">
                      <Building2 className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="flex flex-col leading-none">
                      <span className="button-mono text-[9px] font-medium text-white/40 uppercase tracking-[0.22em]">
                        The core
                      </span>
                      <span className="button-mono text-[15px] font-semibold text-white uppercase tracking-[0.14em] whitespace-nowrap mt-1">
                        Your Business
                      </span>
                    </span>
                  </div>

                  {/* Branch nodes — what SN builds around it, each with its own icon */}
                  {orbitNodes.map((node, idx) => (
                    <div
                      key={node.label}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <motion.div
                        className="flex items-center gap-2.5 bg-white rounded-lg border border-[#0c1d2e]/10 px-3 py-2.5 shadow-[0_4px_16px_rgba(12,29,46,0.08)]"
                        initial={{ opacity: 0, scale: 0.85 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7, delay: 0.35 + idx * 0.15, ease }}
                      >
                        <span className="grid place-items-center w-8 h-8 rounded-md bg-[#3b86d2]/10 text-[#3b86d2] flex-shrink-0">
                          <node.Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="button-mono text-[11px] font-semibold text-[#0c1d2e] uppercase tracking-[0.14em] whitespace-nowrap">
                            {node.label}
                          </span>
                          <span className="text-[12px] text-[#0c1d2e]/55 leading-snug whitespace-nowrap">
                            {node.sub}
                          </span>
                        </span>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Mobile: stacked hierarchy, hub over branches ── */}
              <motion.div variants={fade} className="md:hidden flex flex-col items-start">
                <div className="inline-flex items-center gap-3 bg-[#0c1d2e] rounded-lg pl-3 pr-5 py-3">
                  <span className="grid place-items-center w-9 h-9 rounded-md bg-white/10 text-[#3b86d2] flex-shrink-0">
                    <Building2 className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="flex flex-col leading-none">
                    <span className="button-mono text-[9px] font-medium text-white/40 uppercase tracking-[0.22em]">
                      The core
                    </span>
                    <span className="button-mono text-[15px] font-semibold text-white uppercase tracking-[0.14em] mt-1">
                      Your Business
                    </span>
                  </span>
                </div>

                {/* Trunk — continuous line from Your Business down through every branch elbow */}
                <div className="relative w-full">
                  <span
                    className="absolute left-[26px] top-0 bottom-[18px] w-px bg-[#0c1d2e]/15"
                    aria-hidden
                  />

                  <ul className="flex flex-col gap-3 w-full pt-6">
                    {orbitNodes.map((node) => (
                      <li
                        key={node.label}
                        className="relative flex items-center gap-3 pl-6"
                      >
                        {/* branch elbow */}
                        <span
                          className="absolute left-[26px] top-1/2 -translate-y-1/2 w-4 h-px bg-[#0c1d2e]/15"
                          aria-hidden
                        />
                        <span className="grid place-items-center w-9 h-9 rounded-md bg-white text-[#3b86d2] border border-[#0c1d2e]/10 flex-shrink-0 ml-6">
                          <node.Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="button-mono text-[11px] font-semibold text-[#0c1d2e] uppercase tracking-[0.14em]">
                            {node.label}
                          </span>
                          <span className="text-[13px] text-[#0c1d2e]/55 leading-snug">
                            {node.sub}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vision notes on mobile */}
                <ul className="flex flex-col gap-3 mt-8">
                  {visionNotes.map((note) => (
                    <li key={note} className="flex gap-3 text-[#0c1d2e]/60">
                      <span className="mt-[7px] w-[6px] h-[6px] rounded-full bg-[#3b86d2] flex-shrink-0" />
                      <span className="text-[14px] leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </aside>
        </div>
      </div>
    </section>
  );
}
