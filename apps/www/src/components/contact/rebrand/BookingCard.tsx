'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChromaFlow, FlutedGlass, Shader, Swirl } from 'shaders/react';
import SplitCTA from '@/components/ui/SplitCTA';

interface BookingCardProps {
  scheduleUrl: string | null;
  embedUrl: string | null;
}

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay, ease },
  }),
};

export default function BookingCard({ scheduleUrl, embedUrl }: BookingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#d6e4f0] px-4 md:px-6 pb-6 md:pb-8"
      id="book-discovery"
      aria-label="Book a discovery call"
    >
      <motion.div
        className="relative w-full rounded-[2rem] overflow-hidden bg-[#0c1d2e]"
        custom={0.1}
        variants={fade}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {/* ── Fluted glass background — same as footer ── */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <Shader style={{ width: '100%', height: '100%' }}>
            <Swirl colorA="#0c1d2e" colorB="#1b3b5a" detail={1.7} />
            <ChromaFlow
              baseColor="#0c1d2e"
              downColor="#1b3b5a"
              leftColor="#2b5a8c"
              rightColor="#1b3b5a"
              upColor="#0c1d2e"
              momentum={13}
              radius={3.5}
            />
            <FlutedGlass
              aberration={0.61}
              angle={31}
              frequency={8}
              highlight={0.08}
              highlightSoftness={0}
              lightAngle={-90}
              refraction={4}
              shape="rounded"
              softness={1}
              speed={0.15}
            />
          </Shader>
        </div>

        {/* ── Content — sits on top of image, defines card height ── */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-0 px-8 md:px-12 lg:px-16 pt-10 md:pt-14 pb-10 md:pb-12">
          {/* Label — upper left */}
          <motion.div
            className="mb-6 md:mb-0 pt-1"
            custom={0.2}
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <div className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2">
              <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
              <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                Discovery Call
              </span>
            </div>
          </motion.div>

          {/* Right: heading + description + buttons — outer aligns group to right, inner left-aligns content */}
          <div className="flex flex-col gap-6 md:items-start">
            {/* Inner wrapper: pushed right as a block, children left-align naturally */}
            <div className="flex flex-col gap-6 items-start">
            <div className="overflow-hidden pb-[0.04em]">
              <motion.h2
                className="font-normal text-[#ffffff] tracking-tight leading-[1.24]"
                style={{ fontSize: 'clamp(28px, 3.2vw, 48px)' }}
                initial={{ y: '110%' }}
                animate={{ y: inView ? 0 : '110%' }}
                transition={{ duration: 1.0, delay: 0.2, ease }}
              >
                Book a Discovery Call
              </motion.h2>
            </div>

            <motion.p
              className="text-base md:text-lg text-[#ffffff] tracking-[-0.04em] max-w-md"
              style={{ lineHeight: '1.35' }}
              custom={0.3}
              variants={fade}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              Let&apos;s talk through your needs. A 30-minute call is all it
              takes to scope the right support for your team.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-4"
              custom={0.4}
              variants={fade}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              {/* Primary CTA */}
              <SplitCTA
                title="BOOK A CALL"
                href={scheduleUrl ?? '#'}
                ariaLabel="Book a discovery call"
                mainBg="#ffffff"
                mainBgHover="#3b86d2"
                arrowBg="#3b86d2"
                arrowBgHover="#ffffff"
                arrowColor="#ffffff"
                arrowHoverColor="#0c1d2e"
                labelColor="#0c1d2e"
              />

              {/* Calendar toggle — only shown when embed URL is configured */}
              {embedUrl && (
                <button
                  type="button"
                  onClick={() => setCalendarOpen((o) => !o)}
                  className="inline-flex items-center gap-2
                             button-mono text-xs uppercase tracking-[0.15em] text-[#ffffff]
                             hover:text-[#ffffff] transition-colors duration-300"
                  aria-expanded={calendarOpen}
                  aria-controls="inline-calendar"
                >
                  <span
                    className="block h-px bg-current transition-all duration-500"
                    style={{ width: calendarOpen ? '1.5rem' : '0.75rem' }}
                  />
                  {calendarOpen ? 'Hide calendar' : 'Show calendar'}
                </button>
              )}
            </motion.div>
            </div>{/* end inner left-align wrapper */}
          </div>
        </div>

        {/* ── Inline calendar embed ── */}
        <AnimatePresence initial={false}>
          {calendarOpen && embedUrl && (
            <motion.div
              id="inline-calendar"
              key="calendar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 700, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease }}
              className="relative z-10 overflow-hidden px-8 md:px-12 lg:px-16"
            >
              <div className="w-full h-[700px] pb-2">
                <iframe
                  src={embedUrl}
                  title="Book a discovery call"
                  className="w-full h-full rounded-2xl border-0"
                  loading="lazy"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
