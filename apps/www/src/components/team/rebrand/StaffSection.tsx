'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

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

// ── SplitCTA icon pill (exact paths from SplitCTA.tsx) ──
const ICON_DEFAULT =
  'M72.6025 40C72.6025 45.5228 68.1254 50 62.6025 50H10.0104C2.89902 50 -1.93984 42.7863 0.757887 36.2065L13.0579 6.20647C14.5972 2.45204 18.2527 0 22.3104 0H62.6025C68.1254 0 72.6025 4.47715 72.6025 10V40Z';
const ICON_HOVER =
  'M72.6025 40C72.6025 45.5228 68.1254 50 62.6025 50H22.3104C18.2527 50 14.5972 47.54796 13.0579 43.79353L0.757887 13.7935C-1.93984 7.2137 2.89902 0 10.0104 0H62.6025C68.1254 0 72.6025 4.47715 72.6025 10V40Z';

const MORPH_DURATION = 300;
const ARROW_SX = 16 / (24 * (60 / 73));
const ARROW_SY = 16 / (24 * (48 / 50));
const ARROW_CX = 36.5 - (24 * ARROW_SX) / 2;
const ARROW_CY = 25 - (24 * ARROW_SY) / 2;
const ARROW_SLIDE = 52;
const ARROW_PATH = 'M5 12h14M13 6l6 6-6 6';

type StaffMember = { name: string; title: string; image: string };

function extractNums(d: string): number[] {
  return (d.match(/-?[0-9]*\.?[0-9]+/g) ?? []).map(Number);
}

function lerpPath(from: string, to: string, t: number): string {
  const a = extractNums(from);
  const b = extractNums(to);
  let i = 0;
  return from.replace(/-?[0-9]*\.?[0-9]+/g, () => {
    const v = (a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * t;
    i++;
    return Number.parseFloat(v.toFixed(4)).toString();
  });
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function arrowTransform(cx: number): string {
  return `translate(${cx.toFixed(3)},${ARROW_CY.toFixed(3)}) scale(${ARROW_SX.toFixed(4)},${ARROW_SY.toFixed(4)})`;
}

function ArrowNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `nav-clip-${uid}`;
  const iconBgRef = useRef<SVGPathElement>(null);
  const iconClipRef = useRef<SVGPathElement>(null);
  const arrowDefRef = useRef<SVGGElement>(null);
  const arrowHovRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const animate = useCallback(
    (toHover: boolean) => {
      if (disabled) return;
      cancelAnimationFrame(rafRef.current);
      const from = progressRef.current;
      const to = toHover ? 1 : 0;
      const dist = Math.abs(to - from);
      if (dist === 0) return;
      const duration = MORPH_DURATION * dist;
      const startTime = performance.now();

      const frame = (now: number) => {
        const raw = Math.min((now - startTime) / duration, 1);
        const p = from + (to - from) * easeOutQuad(raw);
        progressRef.current = p;

        const iconD = lerpPath(ICON_DEFAULT, ICON_HOVER, p);
        iconBgRef.current?.setAttribute('d', iconD);
        iconClipRef.current?.setAttribute('d', iconD);

        arrowDefRef.current?.setAttribute('transform', arrowTransform(ARROW_CX + p * ARROW_SLIDE));
        arrowHovRef.current?.setAttribute(
          'transform',
          arrowTransform(ARROW_CX + (p - 1) * ARROW_SLIDE),
        );

        if (raw < 1) rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    },
    [disabled],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => animate(true)}
      onMouseLeave={() => animate(false)}
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
      className="transition-opacity duration-300 cursor-pointer disabled:cursor-default"
      style={{
        opacity: disabled ? 0.3 : 1,
        transform: direction === 'left' ? 'rotate(180deg)' : 'none',
        display: 'block',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 73 50"
        width={52}
        height={36}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={clipId}>
            <path ref={iconClipRef} d={ICON_DEFAULT} />
          </clipPath>
        </defs>
        <path ref={iconBgRef} fill="#0c1d2e" d={ICON_DEFAULT} />
        <g clipPath={`url(#${clipId})`}>
          <g ref={arrowDefRef} transform={arrowTransform(ARROW_CX)}>
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
    </button>
  );
}

function smoothScrollTo(el: HTMLDivElement, target: number, duration = 600) {
  const start = el.scrollLeft;
  const delta = target - start;
  if (delta === 0) return;
  const startTime = performance.now();

  const frame = (now: number) => {
    const raw = Math.min((now - startTime) / duration, 1);
    const t = raw === 1 ? 1 : 1 - Math.pow(2, -10 * raw);
    el.scrollLeft = start + delta * t;
    if (raw < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function StaffCarousel({ title, description, members }: { title: string; description: string; members: StaffMember[] }) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.offsetWidth >= el.scrollWidth - 1);

    setIsScrolling(true);
    clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => setIsScrolling(false), 150);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(syncEdges);
    return () => cancelAnimationFrame(id);
  }, [syncEdges]);

  useEffect(() => () => clearTimeout(scrollEndTimer.current), []);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 240) + 16;
    smoothScrollTo(el, el.scrollLeft + (dir === 'right' ? step : -step));
  };

  return (
    <div>
      {/* Mobile: section name + description above carousel */}
      <motion.div
        className="md:hidden flex flex-col gap-3 mb-5"
        variants={stagger()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <motion.p
          variants={fade}
          className="font-sans font-normal text-2xl text-[#0c1d2e] tracking-[-0.03em] leading-tight"
          style={{ whiteSpace: 'pre-line' }}
        >
          {title}
        </motion.p>
        <motion.p
          variants={fade}
          className="text-base font-medium text-[#0c1d2e]/65 tracking-[-0.04em]"
          style={{ lineHeight: '1.35' }}
        >
          {description}
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      {/* Left: section header + description (desktop only) */}
      <motion.div
        className="hidden md:flex flex-col gap-4 md:pr-8 pt-0 md:pt-3"
        variants={stagger()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="overflow-hidden pb-[10px]">
          <motion.p
            variants={line}
            className="font-sans font-normal text-2xl md:text-3xl text-[#0c1d2e] tracking-[-0.03em] leading-tight"
            style={{ whiteSpace: 'pre-line' }}
          >
            {title}
          </motion.p>
        </div>
        <motion.p
          variants={fade}
          className="text-base md:text-lg text-[#0c1d2e]/65 tracking-[-0.04em]"
          style={{ lineHeight: '1.35' }}
        >
          {description}
        </motion.p>
      </motion.div>

      {/* Right: carousel */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 transition-opacity duration-300"
            style={{
              opacity: isScrolling ? 1 : 0,
              background: 'linear-gradient(to right, #d6e4f0, rgba(214,228,240,0))',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 transition-opacity duration-300"
            style={{
              opacity: isScrolling ? 1 : 0,
              background: 'linear-gradient(to left, #d6e4f0, rgba(214,228,240,0))',
            }}
          />
          <div
            ref={trackRef}
            onScroll={syncEdges}
            className="flex gap-4 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {members.map((member) => (
              <div
                key={member.name}
                className="group flex flex-col bg-white rounded-[1.25rem] overflow-hidden flex-shrink-0 w-full md:w-[calc((100%-32px)/3)]"
              >
                <div className="p-2.5 pb-0">
                  <div className="relative w-full aspect-[4/4] overflow-hidden rounded-[0.65rem] bg-[#e8f0f8]">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 80vw, (max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                </div>
                <div className="px-3.5 pt-3 pb-4 flex flex-col gap-0.5">
                  <p className="font-sans font-normal text-base text-[#0c1d2e] tracking-[-0.02em] leading-snug">
                    {member.name}
                  </p>
                  <p className="button-mono text-xs font-medium text-[#0c1d2e]/45 uppercase tracking-[0.15em] leading-snug">
                    {member.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-0.5 justify-end mt-4">
          <ArrowNavButton direction="left" onClick={() => scroll('left')} disabled={atStart} />
          <ArrowNavButton direction="right" onClick={() => scroll('right')} disabled={atEnd} />
        </div>
      </motion.div>
      </div>
    </div>
  );
}

const hrStaff: StaffMember[] = [
  {
    name: 'Ariana Ricardo',
    title: 'Personal Assistant to CEO',
    image: '/staff-images/Ariana Ricardo.png',
  },
  {
    name: 'Camille Buquir',
    title: 'HR Manager',
    image: '/staff-images/Cams Buquir.png',
  },
  {
    name: 'Hannah Amsal El-Banna',
    title: 'Personal Assistant to CEO',
    image: '/staff-images/Hannah Amsal El-Banna.jpg',
  },
  {
    name: 'Tina Olavia',
    title: 'Property and Administration Officer',
    image: '/staff-images/Tina Olavia.jpg',
  },
  {
    name: 'Hazel Joyce Valerozo',
    title: 'Accounting Associate',
    image: '/associate-images/Hazel Joyce Valerozo.png',
  },
];

const devStaff: StaffMember[] = [
  {
    name: 'Ceferino Jumao-as V',
    title: 'Senior AI Specialist',
    image: '/associate-images/Ceferino Jumao-as V.png',
  },
  {
    name: 'Kazz Virtudez',
    title: 'AI Specialist',
    image: '/associate-images/Kazz Virtudez.jpg',
  },
  {
    name: 'Naima Tasnia',
    title: 'AI Specialist',
    image: '/associate-images/Naima Tasnia.png',
  },
  {
    name: 'Franz Ivan De Villa',
    title: 'AI Specialist',
    image: '/associate-images/Franz Ivan De Villa.png',
  },
  {
    name: 'Immaculate Fallaria',
    title: 'AI Specialist',
    image: '/associate-images/Imma Fallaria.png',
  },
];

const marketingStaff: StaffMember[] = [
  {
    name: 'Lolita Jonquil Cruz',
    title: 'Meta Ads Specialist',
    image: '/staff-images/LJ Cruz.png',
  },
  {
    name: 'Bianca Marie Ragadio',
    title: 'Google Ads Specialist',
    image: '/staff-images/Bianca Marie Ragadio.png',
  },
  {
    name: 'John Christian Tulio',
    title: 'Digital Content Designer',
    image: '/staff-images/JC Tulio.png',
  },
  {
    name: 'Scvenska Vion Galla',
    title: 'Video Editor Associate',
    image: '/associate-images/Schvenska Vion.png',
  },
  {
    name: 'Francine Nastassja Jara',
    title: 'Web Developer Associate',
    image: '/associate-images/Francine Jara.png',
  },
  {
    name: 'John Mirko Velasquez',
    title: 'Digital Marketing Associate',
    image: '/associate-images/John Mirko Velasquez.png',
  },
  {
    name: 'Thea Patricia Arellano',
    title: 'Graphic Design Associate',
    image: '/associate-images/Thea Patricia Arellano.png',
  },
];

export default function StaffSection() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden rounded-b-[2rem]"
      id="staff-section"
    >
      <div className="w-full px-6 md:px-[4.5rem] lg:px-[5.5rem] pt-4 md:pt-8 pb-16 md:pb-[124px]">

        {/* ── Top row: label left · body right ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] mb-6 md:mb-8">
          <motion.aside
            className="pt-0 md:pt-3 pb-6 md:pb-0"
            variants={stagger()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div
              variants={fade}
              className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2 w-fit"
            >
              <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
              <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                Staff
              </span>
            </motion.div>
          </motion.aside>

          <motion.p
            variants={fade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="pt-0 md:pt-3 text-base md:text-lg font-medium sm:font-normal text-[#0c1d2e]/65 tracking-[-0.04em]"
            style={{ lineHeight: '1.35' }}
          >
            Meet the staff behind the daily work, creative output, and operational momentum across
            the organization.
          </motion.p>
        </div>

        {/* Full-width divider */}
        <div className="hidden md:block h-px bg-[#0c1d2e]/10 -mx-[4.5rem] lg:-mx-[5.5rem] mb-14" />

        {/* ── HR carousel ── */}
        <StaffCarousel
          title={'HR, Executive\nSupport and Admin'}
          description="The people keeping the organization running, managing people operations, executive coordination, administration, and the internal processes that hold everything together."
          members={hrStaff}
        />

        {/* Spacer between carousels */}
        <div className="mt-14 md:mt-20" />

        {/* ── Marketing carousel ── */}
        <StaffCarousel
          title="Marketing Team"
          description="A team of digital specialists and creatives driving brand visibility, audience growth, and content across every channel, from paid media to design and video."
          members={marketingStaff}
        />

        {/* Spacer between carousels */}
        <div className="mt-14 md:mt-20" />

        {/* ── Dev Team carousel ── */}
        <StaffCarousel
          title="Dev Team"
          description="AI specialists building and deploying intelligent systems that power client workflows, automate processes, and create scalable solutions across the organization."
          members={devStaff}
        />

      </div>
    </section>
  );
}
