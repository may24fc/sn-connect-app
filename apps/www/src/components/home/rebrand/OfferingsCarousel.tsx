'use client';

import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';

const WORDS = [
  'Discovery',
  'Talent Matching',
  'Onboarding',
  'Workflow Automation',
  'Execution',
  'Reporting',
  'Support',
  'Scaling',
];

const HOLD_DURATION = 1100; // ms a word stays centered before advancing
const STEP_DURATION = 0.55; // seconds for the "click next" snap transition

export default function OfferingsCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const words = Array.from(track.children) as HTMLElement[];
    const count = WORDS.length;

    const wordAt = (i: number): HTMLElement => {
      const el = words[i];
      if (!el) throw new Error(`OfferingsCarousel: no word element at index ${i}`);
      return el;
    };

    const centerXFor = (word: HTMLElement) =>
      container.clientWidth / 2 - (word.offsetLeft + word.offsetWidth / 2);

    // Start on the middle copy so a real neighbor word always exists on
    // both sides — the wrap then jumps between two middle-copy positions
    // that have identical left/right context, making it seamless.
    let logicalIndex = count;
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout>;
    let stepTween: gsap.core.Tween | null = null;

    gsap.set(track, { x: centerXFor(wordAt(logicalIndex)) });
    setActiveIndex(logicalIndex % count);

    const runStep = () => {
      if (cancelled) return;
      const nextIndex = logicalIndex + 1;
      const targetWord = wordAt(nextIndex);

      setActiveIndex(nextIndex % count);

      stepTween = gsap.to(track, {
        x: centerXFor(targetWord),
        duration: STEP_DURATION,
        ease: 'power3.inOut',
        onComplete: () => {
          if (cancelled) return;
          if (nextIndex >= count * 2) {
            // wrap silently back to the equivalent middle-copy position —
            // same neighbors on both sides, so no visible pop
            logicalIndex = nextIndex - count;
            gsap.set(track, { x: centerXFor(wordAt(logicalIndex)) });
          } else {
            logicalIndex = nextIndex;
          }
          holdTimer = setTimeout(runStep, HOLD_DURATION);
        },
      });
    };

    holdTimer = setTimeout(runStep, HOLD_DURATION);

    const handleResize = () => {
      const idx = logicalIndex;
      gsap.set(track, { x: centerXFor(wordAt(idx)) });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      clearTimeout(holdTimer);
      stepTween?.kill();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl h-12 md:h-16 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
      id="offerings-carousel"
    >
      <div
        ref={trackRef}
        className="flex items-center h-full absolute left-0 top-0 whitespace-nowrap will-change-transform"
      >
        {[...WORDS, ...WORDS, ...WORDS].map((word, i) => {
          const isActive = i % WORDS.length === activeIndex;
          return (
            <span
              key={i}
              className={`inline-block px-5 md:px-7 font-sans font-normal tracking-tight text-xl sm:text-2xl md:text-3xl transition-[transform,color,opacity] duration-500 ease-out ${
                isActive ? 'scale-125 text-[#3b86d2] opacity-100' : 'scale-90 text-[#0c1d2e] opacity-35'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
