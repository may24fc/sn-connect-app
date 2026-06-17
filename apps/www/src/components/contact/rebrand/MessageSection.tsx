'use client';

import { motion, useInView } from 'framer-motion';
import { Suspense, useRef } from 'react';
import { ContactForm } from '../ContactForm';
import { COMPANY } from '@/data/placeholder';

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay, ease },
  }),
};

const contactLinks = [
  { label: 'General Enquiries', href: `mailto:${COMPANY.email}`, display: COMPANY.email },
  { label: 'LinkedIn', href: COMPANY.social.linkedin, display: 'SN International Group', external: true },
];

export default function MessageSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#d6e4f0] overflow-hidden rounded-b-[2rem]"
      id="message-us"
      aria-label="Message us"
    >

      <div
        className="w-full max-w-[1440px] mx-auto
                   grid grid-cols-1 md:grid-cols-[1fr_1.6fr]
                   gap-0
                   px-6 sm:px-10 md:px-12 lg:px-16
                   py-16 md:py-24 lg:py-32"
      >
        {/* ── Left sidebar ── */}
        <div className="mb-10 md:mb-0 md:pr-12 lg:pr-20 flex flex-col justify-start gap-8 md:gap-2">
          {/* Heading */}
          <div className="overflow-hidden pb-[0.04em]">
            <motion.h2
              className="font-normal text-[#0c1d2e] tracking-tight leading-[1.24]"
              style={{ fontSize: 'clamp(28px, 3.2vw, 48px)' }}
              initial={{ y: '110%' }}
              animate={{ y: inView ? 0 : '110%' }}
              transition={{ duration: 1.0, ease }}
            >
              Message us
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p
            className="text-base md:text-lg text-[#0c1d2e]/65 tracking-[-0.04em]"
            style={{ lineHeight: '1.35' }}
            custom={0.15}
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            We&apos;d love to hear from you — send us a message and
            we&apos;ll be in touch within one business day.
          </motion.p>

          {/* Contact links */}
          <motion.div
            className="flex flex-col gap-14 mt-14"
            custom={0.25}
            variants={fade}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            {contactLinks.map(({ label, href, display, external }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="button-mono text-xs font-medium uppercase tracking-[0.15em] text-[#0c1d2e]/65">
                  {label}
                </span>
                <a
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  className="group relative inline-block w-fit text-2xl text-[#0c1d2e]"
                >
                  {display}
                  <span
                    className="absolute bottom-0 left-0 w-full h-[1px] bg-[#3b86d2]
                               origin-left scale-x-100 group-hover:scale-x-0
                               transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
                  />
                </a>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: form ── */}
        <motion.div
          className="rounded-2xl overflow-hidden"
          custom={0.1}
          variants={fade}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <Suspense fallback={<div className="h-64 rounded-2xl bg-white/60 animate-pulse" />}>
            <ContactForm />
          </Suspense>
        </motion.div>
      </div>

      {/* Bottom fade into footer */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(12,29,46,0.04) 100%)',
        }}
        aria-hidden
      />
    </section>
  );
}
