'use client';

import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from '@/hooks/useSmoothScroll';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 22; // seconds for one full loop at 1× speed
const BASE_SPEED = 1;
const MAX_BOOST = 3.5; // max timeScale magnitude during scroll bursts
const VELOCITY_DIVISOR = 1800; // higher = less sensitive to scroll velocity
const MIN_VELOCITY = 15; // ignore tiny direction flips near rest
const COPY_COUNT = 6;

export default function ScrollMarquee() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    const inner   = innerRef.current;
    if (!section || !track || !inner) return;

    // Oversize the track (matches integratedbio technique) so the ±10vw parallax
    // drift never exposes an empty edge at either side.
    gsap.set(track, { marginLeft: '-10%', width: '120%' });

    const baseCopies = Array.from(inner.children) as HTMLElement[];
    baseCopies.forEach((node) => node.setAttribute('data-marquee-base', 'true'));

    // Ensure enough copies to fully cover the viewport plus buffer.
    let guard = 0;
    while (inner.scrollWidth < track.clientWidth * 2.4 && guard < 8) {
      baseCopies.forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-marquee-clone', 'true');
        inner.appendChild(clone);
      });
      guard += 1;
    }

    const copies = Array.from(inner.children) as HTMLElement[];

    // Base loop: position copies end-to-end, then wrap xPercent for seamless reverse.
    const wrapX = gsap.utils.wrap(-100 * (copies.length - 1), 0);
    gsap.set(copies, { xPercent: (i) => i * 100 });
    const marqueeTween = gsap.to(copies, {
      xPercent: '-=100',
      repeat: -1,
      duration: DURATION,
      ease: 'none',
      modifiers: {
        xPercent: wrapX,
      },
    });
    marqueeTween.totalProgress(0.5);

    // Single tracked tween — kill previous before starting new to avoid conflicts and O(n) overwrite scan
    let tsTween: gsap.core.Tween | null = null;
    const setTimeScale = (target: number, duration: number) => {
      tsTween?.kill();
      tsTween = gsap.to(marqueeTween, { timeScale: target, duration, ease: 'power2.out' });
    };
    let idleTimer: ReturnType<typeof setTimeout>;
    let lastDirection = 1;
    let idleDirection = 1;

    let isActive = false;
    const dirTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle(self) {
        isActive = self.isActive;
      },
      onUpdate(self) {
        if (lenis) return;
        if (!isActive) return;
        const velocity = self.getVelocity();
        const absVelocity = Math.abs(velocity);
        if (absVelocity < MIN_VELOCITY) return;
        const boost = gsap.utils.clamp(0, MAX_BOOST - BASE_SPEED, absVelocity / VELOCITY_DIVISOR);
        lastDirection = velocity >= 0 ? 1 : -1;
        const scale = lastDirection === 1 ? BASE_SPEED + boost : -(BASE_SPEED + boost);
        setTimeScale(scale, 0.12);
        clearTimeout(idleTimer);
        idleDirection = lastDirection;
        idleTimer = setTimeout(() => {
          if (idleDirection === lastDirection) {
            setTimeScale(BASE_SPEED * lastDirection, 0.4);
          }
        }, 80);
      },
    });

    const lenis = getLenis();
    const handleLenis = (instance: { velocity: number; direction: number }) => {
      if (!isActive) return;
      const absVelocity = Math.abs(instance.velocity);
      if (absVelocity < MIN_VELOCITY) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setTimeScale(BASE_SPEED * lastDirection, 0.4), 80);
        return;
      }
      const boost = gsap.utils.clamp(0, MAX_BOOST - BASE_SPEED, absVelocity / VELOCITY_DIVISOR);
      lastDirection = instance.direction >= 0 ? 1 : -1;
      const scale = lastDirection === 1 ? BASE_SPEED + boost : -(BASE_SPEED + boost);
      setTimeScale(scale, 0.12);
      clearTimeout(idleTimer);
      idleDirection = lastDirection;
      idleTimer = setTimeout(() => {
        if (idleDirection === lastDirection) {
          setTimeScale(BASE_SPEED * lastDirection, 0.4);
        }
      }, 80);
    };
    lenis?.on('scroll', handleLenis);

    // Parallax drift: +10vw → -10vw tied directly to scroll position (scrub: 0)
    const driftTween = gsap.fromTo(
      track,
      { x: '10vw' },
      {
        x: '-10vw',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0,
        },
      }
    );

    return () => {
      clearTimeout(idleTimer);
      tsTween?.kill();
      marqueeTween.kill();
      dirTrigger.kill();
      lenis?.off('scroll', handleLenis);
      inner.querySelectorAll('[data-marquee-clone="true"]').forEach((node) => node.remove());
      driftTween.scrollTrigger?.kill();
      driftTween.kill();
      gsap.set(track, { clearProps: 'marginLeft,width,x' });
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[#d6e4f0] py-10 sm:py-14 md:py-40 select-none border-t border-b border-[#0c1d2e]/10"
      id="scroll-marquee-section"
    >
      {/* will-change on track AND each copy — compositor layers created at mount, not on first scroll */}
      <div
        ref={trackRef}
        className="flex items-center"
        style={{ willChange: 'transform' }}
        id="marquee-track"
      >
        <div ref={innerRef} className="flex items-center" style={{ willChange: 'transform' }}>
          {Array.from({ length: COPY_COUNT }, (_, i) => (
            <span
              key={i}
              className="inline-flex items-center shrink-0 gap-6 md:gap-10 pr-10 md:pr-16"
              style={{ willChange: 'transform' }}
            >
              <span className="whitespace-nowrap text-5xl sm:text-6xl md:text-[clamp(48px,11.1vw,160px)] font-sans font-normal tracking-tight text-[#0c1d2e]">
                Remote support, matched with care
              </span>
              <span className="whitespace-nowrap text-5xl sm:text-6xl md:text-[clamp(48px,11.1vw,160px)] font-sans font-light text-[#0c1d2e]/25 leading-none">
                &ndash;
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
