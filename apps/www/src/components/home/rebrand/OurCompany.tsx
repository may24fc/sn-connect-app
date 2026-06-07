'use client';

import { motion } from 'framer-motion';
import SplitCTA from '../../ui/SplitCTA';

const ease = [0.19, 1, 0.22, 1] as const;

const line = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1.0, ease } },
};

const fade = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

export default function OurCompany() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden border-t border-[#0c1d2e]/10 rounded-b-[2rem]"
      id="our-company-section"
    >
      {/* Label strip */}
      <aside className="w-full px-6 md:px-12 pt-12 pb-10" id="company-label-row">
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
              Our Company
            </span>
          </motion.div>
        </motion.div>
      </aside>

      <div
        className="w-full px-6 md:px-12 pt-0 pb-24 md:pb-[126px] grid grid-cols-1 md:grid-cols-[2fr_2fr] gap-8 md:gap-12 items-start"
        id="our-company-inner"
      >
        {/* CEO portrait */}
        <aside className="hidden md:block" id="company-sidebar">
          <div
            className="group relative w-full overflow-hidden rounded-2xl bg-[#a1c6e7] cursor-pointer h-[520px]"
            id="company-image-container"
          >
            <img
              fetchPriority="high"
              decoding="async"
              src="/steven-nhan-candid.png"
              alt="SN International Group team"
              className="w-full h-full object-cover object-[center_40%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              id="company-ceo-photo"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between pointer-events-none">
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-sans font-normal text-lg leading-tight">
                  Steven Nhan
                </span>
                <span className="button-mono text-xs text-white/60 uppercase tracking-[0.15em]">
                  Founder &amp; CEO
                </span>
              </div>
            </div>
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
          </div>
        </aside>

        <div className="flex flex-col gap-10" id="company-main-content">
          {/* Heading — two lines staggered */}
          <motion.h2
            className="text-3xl sm:text-4xl md:text-[42px] font-normal leading-tight tracking-tight text-[#0c1d2e] font-sans text-left select-none max-w-3xl"
            variants={stagger()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            id="company-heading"
          >
            <div className="overflow-hidden pb-[0.04em]">
              <motion.span className="block" variants={line}>
                Built for modern teams and
              </motion.span>
            </div>
            <div className="overflow-hidden pb-[0.18em]">
              <motion.span className="block" variants={line}>
                the next generation of remote work.
              </motion.span>
            </div>
          </motion.h2>

          {/* Body text — single column */}
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            id="company-body"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="overflow-hidden">
                <motion.p
                  variants={line}
                  className="text-[#0c1d2e]/65 text-[15px] sm:text-base font-normal tracking-[-0.04em]"
                  style={{ lineHeight: '1.6' }}
                  id="company-text-col-1"
                >
                  We provide businesses with remote specialists who combine professional expertise
                  with modern AI-powered workflows. The result is a team that can move faster,
                  handle more complexity, and deliver higher-quality outcomes than traditional
                  remote staffing models.
                </motion.p>
              </div>
              <div className="overflow-hidden">
                <motion.p
                  variants={line}
                  className="text-[#0c1d2e]/65 text-[15px] sm:text-base font-normal tracking-[-0.04em]"
                  style={{ lineHeight: '1.6' }}
                  id="company-text-col-2"
                >
                  Whether you're scaling operations, expanding marketing efforts, supporting
                  customers, or building new capabilities, we help you access talent that's already
                  prepared for how modern businesses work.
                </motion.p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            id="company-btn-wrapper"
          >
            <SplitCTA title="MEET THE TEAM" href="#about" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
