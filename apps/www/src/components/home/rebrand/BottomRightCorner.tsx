'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

export default function BottomRightCorner() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="absolute bottom-0 right-0 p-4 pt-6 pl-10 md:p-8 md:pt-10 md:pl-16 bg-[#f0f0f0] rounded-tl-[2rem] md:rounded-tl-[4rem] flex items-center gap-4 md:gap-8 z-30"
      id="bottom-right-corner"
    >
      <div
        className="absolute -top-[2rem] md:-top-[4rem] right-0 w-[2rem] md:w-[4rem] h-[2rem] md:h-[4rem] pointer-events-none"
        id="corner-mask-top"
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M56 56V0C56 30.9279 30.9279 56 0 56H56Z" fill="#f0f0f0" />
        </svg>
      </div>

      <div
        className="absolute bottom-0 -left-[2rem] md:-left-[4rem] w-[2rem] md:w-[4rem] h-[2rem] md:h-[4rem] pointer-events-none"
        id="corner-mask-left"
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M56 56H0C30.9279 56 56 30.9279 56 0V56Z" fill="#f0f0f0" />
        </svg>
      </div>

      <div
        className="bg-[#1e325a]/5 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border border-[#1e325a]/10 shrink-0"
        id="circle-icon-wrapper"
      >
        <ArrowUpRight className="w-5 h-5 md:w-7 md:h-7 text-[#1e325a]/80" id="circle-icon" />
      </div>

      <div className="flex flex-col select-none" id="info-column">
        <h3
          className="text-lg md:text-2xl font-normal text-[#1e325a] leading-tight"
          id="info-title"
        >
          Documentation
        </h3>
        <div
          className="flex items-center gap-1 md:gap-2 text-[#1e325a]/60 cursor-pointer hover:text-[#1e325a] transition-colors mt-0.5"
          id="library-link-container"
        >
          <span className="text-sm md:text-base font-normal" id="library-text">
            Library
          </span>
          <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" id="library-chevron" />
        </div>
      </div>
    </motion.div>
  );
}
