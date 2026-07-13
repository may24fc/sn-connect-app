'use client';

import { motion } from 'framer-motion';
import SplitCTA from '../../ui/SplitCTA';
// import OfferingsCarousel from './OfferingsCarousel';

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

const sidebarPoints = ['AI-assisted matching', 'Human-led delivery', 'AU + US timezone coverage'];

const processSteps = [
  {
    index: '01',
    title: 'Share your brief',
    text: 'Tell us your goals, gaps, and timeline.',
  },
  {
    index: '02',
    title: 'Meet your match',
    text: 'AI-assisted vetting pairs you with the right specialists in days.',
  },
  {
    index: '03',
    title: 'Integrate fast',
    text: 'Your talent embeds into your team with AI-powered workflows.',
  },
  {
    index: '04',
    title: 'Track and scale',
    text: 'Clear reporting, ongoing support, and room to grow on demand.',
  },
];

export default function IntegratedPlatform() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden"
      id="integrated-platform-section"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-[#0c1d2e]/10" />

      {/* ── Background: blueprint grid + glow + tick marks ── */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden
        id="platform-bg"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(12,29,46,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(12,29,46,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 95% 90% at 50% 45%, black 35%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 95% 90% at 50% 45%, black 35%, transparent 100%)',
          }}
        />
        <div className="absolute -top-40 right-[-8%] w-[560px] h-[560px] rounded-full bg-[#3b86d2]/[0.16] blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-6%] w-[420px] h-[420px] rounded-full bg-white/40 blur-[120px]" />
        <span className="hidden md:block absolute top-[16%] left-[30%] button-mono text-lg text-[#0c1d2e]/20">
          +
        </span>
        <span className="hidden md:block absolute top-[58%] left-[8%] button-mono text-lg text-[#0c1d2e]/20">
          +
        </span>
        <span className="hidden md:block absolute top-[10%] right-[6%] button-mono text-lg text-[#0c1d2e]/20">
          +
        </span>
        <span className="hidden md:block absolute bottom-[12%] right-[22%] button-mono text-lg text-[#0c1d2e]/20">
          +
        </span>
      </div>

      <div className="relative w-full px-6 md:px-12 py-16 md:py-[124px]">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* ── Left sidebar ── */}
          <aside className="md:col-span-1 md:pr-4 pt-0 pb-8 md:pb-0" id="platform-sidebar">
            <motion.div
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col items-start"
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

              <motion.p
                variants={fade}
                className="mt-6 md:mt-8 text-base md:text-lg text-[#0c1d2e]/65 leading-relaxed max-w-xs"
                id="platform-sidebar-copy"
              >
                One streamlined engagement, from first brief to a fully embedded team, with AI
                working at every step.
              </motion.p>

              <motion.ul
                variants={fade}
                className="hidden md:flex mt-10 w-full max-w-xs flex-col divide-y divide-[#0c1d2e]/10 border-y border-[#0c1d2e]/10"
                id="platform-sidebar-points"
              >
                {sidebarPoints.map((point) => (
                  <li key={point} className="flex items-center gap-3 py-3.5">
                    <span className="w-[6px] h-[6px] bg-[#3b86d2] flex-shrink-0" />
                    <span className="button-mono text-xs uppercase tracking-[0.18em] text-[#0c1d2e]/60">
                      {point}
                    </span>
                  </li>
                ))}
              </motion.ul>
            </motion.div>
          </aside>

          {/* ── Right content ── */}
          <aside
            className="md:col-span-2 md:pl-4 pt-0 flex flex-col gap-8 md:gap-10"
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
                  Tell us what you need.{' '}
                  <span className="text-[#0c1d2e]/30">We'll help you get there.</span>
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

            {/* Body content */}
            <motion.div
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col gap-8 md:gap-10"
            >
              {/* <motion.div variants={fade}>
                <OfferingsCarousel />
              </motion.div> */}

              {/* Process steps — stepper rail, cards reveal in sequence */}
              <div id="platform-process-steps">
                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0c1d2e]/10 rounded-2xl overflow-hidden border border-[#0c1d2e]/10">
                  {/* Data pulse traveling along the top edge */}
                  <motion.span
                    className="absolute top-0 z-10 h-[2px] w-32 bg-gradient-to-r from-transparent via-[#3b86d2] to-transparent pointer-events-none"
                    animate={{ left: ['-10%', '110%'] }}
                    transition={{
                      duration: 3.4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                      repeatDelay: 1.4,
                    }}
                    aria-hidden
                  />
                  {processSteps.map((step, idx) => {
                    const isLast = idx === processSteps.length - 1;
                    return (
                      <motion.div
                        key={step.index}
                        className="group relative bg-white/50 sm:hover:bg-white/85 transition-colors duration-300 px-5 py-5 md:px-6 md:py-7 flex flex-col gap-3 md:gap-3.5"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7, delay: idx * 0.14, ease }}
                      >
                        <span
                          className="absolute left-0 top-0 h-[2px] w-0 bg-[#3b86d2] sm:group-hover:w-full transition-all duration-500 ease-out"
                          aria-hidden
                        />
                        {/* Stepper rail: node, index, connector line, direction arrow */}
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0"
                            aria-hidden
                          />
                          <span className="button-mono text-xs font-medium text-[#3b86d2] tracking-[0.18em]">
                            {step.index}
                          </span>
                          <motion.span
                            className="flex-1 h-px bg-[#0c1d2e]/15 origin-left"
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: idx * 0.14 + 0.3, ease }}
                            aria-hidden
                          />
                          {isLast ? (
                            <span
                              className="w-[6px] h-[6px] bg-[#3b86d2] flex-shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <span
                              className="button-mono text-xs text-[#3b86d2]/80 leading-none"
                              aria-hidden
                            >
                              <span className="sm:hidden">↓</span>
                              <span className="hidden sm:inline">→</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg md:text-xl font-normal tracking-tight text-[#0c1d2e] leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-sm text-[#0c1d2e]/60 leading-snug tracking-[-0.02em]">
                          {step.text}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
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
