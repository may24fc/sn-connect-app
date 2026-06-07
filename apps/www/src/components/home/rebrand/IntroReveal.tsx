'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Background color of the rebrand-home wrapper — must match exactly
const BG = '#D6E4F0';
const INSET = 12;   // px — white border width at rest
const RADIUS = 20;  // px — border-radius at rest

export default function IntroReveal() {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    gsap.killTweensOf(frame);

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let scrollTween: gsap.core.Tween | null = null;
    const tl = gsap.timeline({ delay: 0.35 });

    // Phase 1: 0×0 point → pill shape  (the "pill opening")
    tl.to(frame, {
      top: vh / 2 - 14,
      bottom: vh / 2 - 14,
      left: vw / 2 - 60,
      right: vw / 2 - 60,
      borderRadius: 28,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 2: pill → bordered frame  (zooms out to white border)
    tl.to(frame, {
      top: INSET,
      bottom: INSET,
      left: INSET,
      right: INSET,
      borderRadius: RADIUS,
      duration: 0.85,
      ease: 'power3.out',
      onComplete() {
        // Scroll: border zooms off screen as user scrolls
        scrollTween = gsap.to(frame, {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero-section',
            start: 'top top',
            end: '+=280',
            scrub: 0.8,
          },
        });
      },
    });

    return () => {
      tl.kill();
      if (scrollTween) {
        scrollTween.scrollTrigger?.kill();
        scrollTween.kill();
      }
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="fixed z-[60] pointer-events-none"
      style={{
        // Start as a 0×0 point at center — box-shadow covers the full viewport → all white
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
