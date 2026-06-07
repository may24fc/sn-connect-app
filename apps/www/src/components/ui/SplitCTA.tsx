'use client';
import { useCallback, useId, useRef } from 'react';

interface SplitCTAProps {
  title?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

// Left side frozen — only right angled corners morph
const LABEL_DEFAULT =
  'M0 10C0 4.47715 4.47715 0 10 0H248.092C255.204 0 260.042 7.21371 257.345 13.7935L245.045 43.7935C243.505 47.548 239.85 50 235.792 50H10C4.47715 50 0 45.5228 0 40V10Z';
const LABEL_HOVER =
  'M0 10C0 4.47715 4.47715 0 10 0H235.792C239.85 0 243.505 2.452 245.045 6.2065L257.345 36.2065C260.042 42.78629 255.204 50 248.092 50H10C4.47715 50 0 45.5228 0 40V10Z';

// Right side frozen — only left angled corners morph
const ICON_DEFAULT =
  'M72.6025 40C72.6025 45.5228 68.1254 50 62.6025 50H10.0104C2.89902 50 -1.93984 42.7863 0.757887 36.2065L13.0579 6.20647C14.5972 2.45204 18.2527 0 22.3104 0H62.6025C68.1254 0 72.6025 4.47715 72.6025 10V40Z';
const ICON_HOVER =
  'M72.6025 40C72.6025 45.5228 68.1254 50 62.6025 50H22.3104C18.2527 50 14.5972 47.54796 13.0579 43.79353L0.757887 13.7935C-1.93984 7.2137 2.89902 0 10.0104 0H62.6025C68.1254 0 72.6025 4.47715 72.6025 10V40Z';

const DURATION = 300;

// Arrow SVG viewBox is 24×24; pill SVG is 73×50 rendered at 60×48px.
// Scale to produce a visually ~16×16px arrow despite non-square user units.
// px-per-unit: x = 60/73 ≈ 0.822, y = 48/50 = 0.96
const ARROW_SX = 16 / (24 * (60 / 73)); // ≈ 0.812
const ARROW_SY = 16 / (24 * (48 / 50)); // ≈ 0.694
const ARROW_CX = 36.5 - (24 * ARROW_SX) / 2; // left edge when centered ≈ 26.75
const ARROW_CY = 25 - (24 * ARROW_SY) / 2; // top  edge when centered ≈ 16.67
const ARROW_SLIDE = 52; // SVG units — enough to clear the 73-unit wide pill

const ARROW_PATH = 'M5 12h14M13 6l6 6-6 6';

function extractNums(d: string): number[] {
  return (d.match(/-?[0-9]*\.?[0-9]+/g) ?? []).map(Number);
}

function lerpPath(from: string, to: string, t: number): string {
  const a = extractNums(from);
  const b = extractNums(to);
  let i = 0;
  return from.replace(/-?[0-9]*\.?[0-9]+/g, () => {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    const v = av + (bv - av) * t;
    i++;
    return Number.parseFloat(v.toFixed(4)).toString();
  });
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function arrowTransform(cx: number): string {
  return `translate(${cx.toFixed(3)},${ARROW_CY.toFixed(3)}) scale(${ARROW_SX.toFixed(4)},${ARROW_SY.toFixed(4)})`;
}

export default function SplitCTA({
  title = 'Discover our platform',
  href = '#',
  onClick,
  ariaLabel,
}: SplitCTAProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `pill-clip-${uid}`;

  const labelPathRef = useRef<SVGPathElement>(null);
  const iconBgRef = useRef<SVGPathElement>(null);
  const iconClipRef = useRef<SVGPathElement>(null);
  const arrowDefRef = useRef<SVGGElement>(null);
  const arrowHovRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const animate = useCallback(
    (toHover: boolean) => {
      cancelAnimationFrame(rafRef.current);
      const from = progressRef.current;
      const to = toHover ? 1 : 0;
      const dist = Math.abs(to - from);
      if (dist === 0) return;
      const duration = DURATION * dist;
      const startTime = performance.now();

      const frame = (now: number) => {
        const raw = Math.min((now - startTime) / duration, 1);
        const p = from + (to - from) * easeOut(raw);
        progressRef.current = p;

        // morph label background
        labelPathRef.current?.setAttribute('d', lerpPath(LABEL_DEFAULT, LABEL_HOVER, p));

        // morph icon background + clip path in lockstep
        const iconD = lerpPath(ICON_DEFAULT, ICON_HOVER, p);
        iconBgRef.current?.setAttribute('d', iconD);
        iconClipRef.current?.setAttribute('d', iconD);

        // slide arrows
        arrowDefRef.current?.setAttribute('transform', arrowTransform(ARROW_CX + p * ARROW_SLIDE));
        arrowHovRef.current?.setAttribute(
          'transform',
          arrowTransform(ARROW_CX + (p - 1) * ARROW_SLIDE)
        );

        if (raw < 1) rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    },
    [uid]
  );

  return (
    <a
      className="u-btn--1 button_el"
      href={href}
      onClick={onClick}
      aria-label={ariaLabel || title}
      role="button"
      onMouseEnter={() => animate(true)}
      onMouseLeave={() => animate(false)}
    >
      <span className="btn_label button-mono">
        <svg
          className="btn_label_shape"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 259 50"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path ref={labelPathRef} fill="var(--btn-main-bg, #0c1d2e)" d={LABEL_DEFAULT} />
        </svg>
        <span className="btn_label_text">{title}</span>
      </span>

      <i className="btn_icon" aria-hidden>
        {/*
          Single SVG: background + clipPath + arrows in one coordinate space.
          The clipPath mirrors the background path and is updated every RAF frame,
          so arrows are always clipped precisely to the morphing pill shape.
        */}
        <svg
          className="btn_icon_svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 73 50"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id={clipId}>
              <path ref={iconClipRef} d={ICON_DEFAULT} />
            </clipPath>
          </defs>

          {/* pill background */}
          <path
            ref={iconBgRef}
            className="btn_icon_bg"
            fill="var(--btn-arrow-bg, #3b86d2)"
            d={ICON_DEFAULT}
          />

          {/* arrows, clipped to exact pill outline */}
          <g clipPath={`url(#${clipId})`}>
            {/* default arrow — slides out to right on hover */}
            <g ref={arrowDefRef} transform={arrowTransform(ARROW_CX)}>
              <path
                d={ARROW_PATH}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            {/* hover arrow — enters from left on hover, always white */}
            <g ref={arrowHovRef} transform={arrowTransform(ARROW_CX - ARROW_SLIDE)}>
              <path
                d={ARROW_PATH}
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
        </svg>
      </i>
    </a>
  );
}
