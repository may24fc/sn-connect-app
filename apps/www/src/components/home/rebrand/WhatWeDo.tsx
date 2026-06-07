'use client';

import { useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { motion, type MotionValue, useTransform, useMotionValueEvent } from 'framer-motion';

interface WhatWeDoProps {
  scrollYProgress: MotionValue<number>;
}

// Scroll-% offset between each visual line's animation start
const LINE_STAGGER = 0.022;

const slides = [
  {
    text: 'Your workflow is unique. We shape our support around the tools, cadence, and communication style your team already runs on.',
    wordRevealRange: [0, 0.28] as [number, number],
    entryRange: null as [number, number] | null, // visible from scroll 0
    exitRange: [0.28, 0.34] as [number, number],
  },
  {
    text: 'From executive assistants who manage your inbox to marketers who run your campaigns. One brief gets you matched with the right remote team.',
    wordRevealRange: [0.41, 0.61] as [number, number],
    entryRange: [0.35, 0.41] as [number, number],
    exitRange: [0.61, 0.67] as [number, number],
  },
  {
    text: 'We handle the recurring work so your team can focus on growth. Dependable offshore support with AU and US coverage windows and a 7-day typical launch.',
    wordRevealRange: [0.74, 0.92] as [number, number],
    entryRange: [0.68, 0.74] as [number, number],
    exitRange: null, // last text — stays visible, no exit animation
  },
];

function c01(t: number) { return Math.max(0, Math.min(1, t)); }
function easeOut(t: number) { return 1 - (1 - c01(t)) ** 2; }
function easeIn(t: number) { return c01(t) ** 2; }

interface SlideProps {
  words: string[];
  scrollY: MotionValue<number>;
  wordRevealRange: [number, number];
  entryRange: [number, number] | null;
  exitRange: [number, number] | null;
}

function Slide({ words, scrollY, wordRevealRange, entryRange, exitRange }: SlideProps) {
  const spanRefs  = useRef<(HTMLSpanElement | null)[]>([]);
  const lineGroups = useRef<number[][]>([]); // word indices per visual line
  const rootRef   = useRef<HTMLDivElement>(null);

  // ── Compute + apply styles for a given scrollY value ─────────────────
  const applyStyles = useCallback((v: number) => {
    const lines = lineGroups.current;
    if (!lines.length) return;

    const total = words.length;
    const [wrs, wre] = wordRevealRange;
    const slideProgress = c01((v - wrs) / (wre - wrs));

    lines.forEach((wordIndices, lineIdx) => {
      const s = lineIdx * LINE_STAGGER;
      let lineOpacity: number;
      let lineY: number;

      if (entryRange && exitRange) {
        const [es, ee] = [entryRange[0] + s, entryRange[1] + s];
        const [xs, xe] = [exitRange[0] + s, exitRange[1] + s];
        if      (v < es) { lineOpacity = 0; lineY = 28; }
        else if (v < ee) { const t = easeOut((v - es) / (ee - es)); lineOpacity = t; lineY = 28 * (1 - t); }
        else if (v < xs) { lineOpacity = 1; lineY = 0; }
        else if (v < xe) { const t = easeIn((v - xs) / (xe - xs)); lineOpacity = 1 - t; lineY = -28 * t; }
        else             { lineOpacity = 0; lineY = -28; }
      } else if (entryRange && !exitRange) {
        // Last slide — fades up in, never exits
        const [es, ee] = [entryRange[0] + s, entryRange[1] + s];
        if      (v < es) { lineOpacity = 0; lineY = 28; }
        else if (v < ee) { const t = easeOut((v - es) / (ee - es)); lineOpacity = t; lineY = 28 * (1 - t); }
        else             { lineOpacity = 1; lineY = 0; }
      } else if (exitRange) {
        // Slide 1 — no entry, only exit
        const [xs, xe] = [exitRange[0] + s, exitRange[1] + s];
        if      (v < xs) { lineOpacity = 1; lineY = 0; }
        else if (v < xe) { const t = easeIn((v - xs) / (xe - xs)); lineOpacity = 1 - t; lineY = -28 * t; }
        else             { lineOpacity = 0; lineY = -28; }
      } else {
        lineOpacity = 1; lineY = 0;
      }

      wordIndices.forEach(wi => {
        const el = spanRefs.current[wi];
        if (!el) return;

        // Combine line-transition opacity × per-word reveal opacity (0.25 → 1)
        const wordStart = wi / total;
        const wordEnd   = (wi + 1) / total;
        const wordT     = c01((slideProgress - wordStart) / Math.max(wordEnd - wordStart, 1e-6));
        const wordOpacity = 0.25 + 0.75 * wordT;

        el.style.opacity   = String(lineOpacity * wordOpacity);
        el.style.transform = `translateY(${lineY}px)`;
      });
    });
  }, [words.length, wordRevealRange, entryRange, exitRange]);

  // ── Measure visual lines by offsetTop after layout ────────────────────
  const measureLines = useCallback(() => {
    const spans = spanRefs.current;
    if (!spans.length) return;

    const groups: number[][] = [];
    let lastTop: number | null = null;
    let current: number[] = [];

    spans.forEach((el, i) => {
      if (!el) return;
      const top = Math.round(el.offsetTop);
      if (top !== lastTop) {
        if (current.length) groups.push(current);
        current = [i];
        lastTop = top;
      } else {
        current.push(i);
      }
    });
    if (current.length) groups.push(current);
    lineGroups.current = groups;

    // Re-apply styles now that line groups are known
    applyStyles(scrollY.get());
  }, [applyStyles, scrollY]);

  useLayoutEffect(() => {
    measureLines();
    const ro = new ResizeObserver(measureLines);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [measureLines]);

  // Apply initial state before first scroll event fires
  useEffect(() => {
    applyStyles(scrollY.get());
  }, [applyStyles, scrollY]);

  useMotionValueEvent(scrollY, 'change', applyStyles);

  const initialOpacity = entryRange ? 0 : 0.25;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 w-full flex flex-wrap gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 content-start pointer-events-auto"
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          ref={el => { spanRefs.current[i] = el; }}
          className="text-[#0c1d2e] select-none font-sans inline-block"
          style={{ opacity: initialOpacity, willChange: 'opacity, transform' }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

export default function WhatWeDo({ scrollYProgress }: WhatWeDoProps) {
  const progressPercent = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const currentNum = useTransform(scrollYProgress, (v): string => {
    if (v < 0.33) return '01';
    if (v < 0.66) return '02';
    return '03';
  });

  return (
    <div
      className="relative z-10 w-full h-full flex flex-col pointer-events-none select-none"
      style={{ paddingTop: '70px' }}
      id="what-wedo-container"
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 md:px-12 pt-12 pb-11" id="what-wedo-header">
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
        <motion.div style={{ width: progressPercent }} className="absolute left-0 top-0 h-[2px] bg-[#0c1d2e]" />
      </div>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-x-32 md:gap-x-72 px-6 md:px-12" id="what-wedo-main">

        {/* Counter */}
        <div className="w-28 md:w-36 flex-shrink-0 flex items-start pt-12">
          <div className="button-mono border border-[#0c1d2e]/30 px-5 py-1 rounded-full flex items-center gap-[0.4em] tracking-[0.2em] text-sm">
            <motion.span className="text-[#0c1d2e] font-medium">{currentNum}</motion.span>
            <span className="text-[#0c1d2e]/40 font-medium">/ 03</span>
          </div>
        </div>

        {/* Text slides */}
        <div className="flex-1 min-w-0 flex items-start pt-12">
          <div
            className="relative w-full text-2xl sm:text-4xl md:text-5xl lg:text-[56px] font-normal tracking-[-0.04em]"
            style={{ lineHeight: '0.95', minHeight: '280px' }}
            id="what-wedo-texts-layer"
          >
            {slides.map((slide, idx) => (
              <Slide
                key={idx}
                words={slide.text.split(' ')}
                scrollY={scrollYProgress}
                wordRevealRange={slide.wordRevealRange}
                entryRange={slide.entryRange}
                exitRange={slide.exitRange}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
