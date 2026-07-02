'use client';

import { type MotionValue, motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';

interface WhatWeDoProps {
  scrollYProgress: MotionValue<number>;
}

const BODY_TEXT =
  'AI-enabled specialists across operations, marketing, support, and technology, integrated into your workflow, with AU and US timezone coverage.';

// Reveal spans the full scroll range so the text finishes exactly as the progress bar completes.
const WORD_REVEAL_RANGE: [number, number] = [0, 1];

function c01(t: number) {
  return Math.max(0, Math.min(1, t));
}

interface TextRevealProps {
  words: string[];
  scrollY: MotionValue<number>;
}

function TextReveal({ words, scrollY }: TextRevealProps) {
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const applyStyles = useCallback(
    (v: number) => {
      const total = words.length;
      const [wrs, wre] = WORD_REVEAL_RANGE;
      const progress = c01((v - wrs) / (wre - wrs));

      words.forEach((_, i) => {
        const el = spanRefs.current[i];
        if (!el) return;
        const wordStart = i / total;
        const wordEnd = (i + 1) / total;
        const wordT = c01((progress - wordStart) / Math.max(wordEnd - wordStart, 1e-6));
        el.style.opacity = String(0.25 + 0.75 * wordT);
      });
    },
    [words]
  );

  useEffect(() => {
    applyStyles(scrollY.get());
  }, [applyStyles, scrollY]);

  useMotionValueEvent(scrollY, 'change', applyStyles);

  return (
    <div className="w-full flex flex-wrap gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 content-start pointer-events-auto">
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          ref={(el) => {
            spanRefs.current[i] = el;
          }}
          className="text-[#0c1d2e] select-none font-sans inline-block"
          style={{ opacity: 0.25, willChange: 'opacity' }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

export default function WhatWeDo({ scrollYProgress }: WhatWeDoProps) {
  const progressPercent = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const words = BODY_TEXT.split(' ');

  return (
    <div
      className="relative z-10 w-full flex flex-col pointer-events-none select-none"
      id="what-wedo-container"
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 md:px-12 pb-8 md:pb-11" id="what-wedo-header">
        <div className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2">
          <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
          <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
            What We Do
          </span>
        </div>
      </div>

      {/* ── Progress divider ─────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 h-px" id="what-wedo-divider">
        <div className="absolute inset-0 h-[2px] bg-[#0c1d2e]/15" />
        <motion.div
          style={{ width: progressPercent }}
          className="absolute left-0 top-0 h-[2px] bg-[#0c1d2e]"
        />
      </div>

      {/* ── Body text ────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 md:px-12" id="what-wedo-main">
        <div
          className="w-full text-[1.75rem] sm:text-4xl md:text-5xl lg:text-[56px] font-normal tracking-[-0.04em] pt-8 sm:pt-10 md:pt-12 pb-10 md:pb-14"
          style={{ lineHeight: '0.95' }}
          id="what-wedo-text"
        >
          <TextReveal words={words} scrollY={scrollYProgress} />
        </div>
      </div>
    </div>
  );
}
