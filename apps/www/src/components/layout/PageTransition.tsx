'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

const BG = '#ffffff';
const INSET = 12;
const RADIUS = 20;

export default function PageTransition() {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    gsap.killTweensOf(frame);

    const tl = gsap.timeline({ delay: 0.35 });

    // Phase 1: 0×0 → pill (cutout opens)
    tl.to(frame, {
      top: vh / 2 - 14,
      bottom: vh / 2 - 14,
      left: vw / 2 - 60,
      right: vw / 2 - 60,
      borderRadius: 28,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 2: pill → bordered frame (zooms out to reveal most of page)
    tl.to(frame, {
      top: INSET,
      bottom: INSET,
      left: INSET,
      right: INSET,
      borderRadius: RADIUS,
      duration: 0.85,
      ease: 'power3.out',
    });

    // Phase 3: frame → full screen (auto, removes BG overlay entirely)
    tl.to(frame, {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: 0,
      duration: 0.55,
      ease: 'power2.inOut',
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="fixed z-[60] pointer-events-none"
      style={{
        top: '50vh',
        bottom: '50vh',
        left: '50vw',
        right: '50vw',
        borderRadius: '100px',
        boxShadow: `0 0 0 100vmax ${BG}`,
      }}
    />
  );
}
