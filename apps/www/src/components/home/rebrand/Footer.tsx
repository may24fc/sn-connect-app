'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { ChromaFlow, FlutedGlass, Shader, Swirl } from 'shaders/react';
import SplitCTA from '../../ui/SplitCTA';

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

export default function Footer() {
  const pathname = usePathname();

  const handleScrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="relative w-full bg-[#0c1d2e] text-[#f6f6f2] overflow-hidden select-none"
      id="footer-section"
    >
      {/* ── Dark fluted glass background ── */}
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

      {/* ── Content ── */}
      <div className="relative z-10 w-full px-6 md:px-12 pt-20 md:pt-28 pb-0" id="footer-inner">
        {/* ── Main row ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-72 items-start pb-[100px]"
          id="footer-main"
        >
          {/* Left — heading + CTA */}
          <div
            className="flex flex-col w-full max-w-lg gap-10 md:gap-12 pb-12 md:pb-0"
            id="footer-content"
          >
            <motion.div
              className="overflow-hidden pb-[0.04em]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.h4
                className="text-2xl sm:text-3xl md:text-[38px] lg:text-[44px] font-normal font-sans"
                style={{ lineHeight: '1.06' }}
                variants={{
                  hidden: { y: '110%' },
                  visible: { y: 0, transition: { duration: 1.0, ease: [0.19, 1, 0.22, 1] } },
                }}
                id="footer-heading"
              >
                Scale smarter with <br /> AI-powered talent.
              </motion.h4>
            </motion.div>

            <motion.div
              variants={fade}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <div
                style={
                  { '--btn-main-bg': '#d6e4f0', '--btn-arrow-bg': '#3b86d2' } as React.CSSProperties
                }
                className="footer-cta"
              >
                <SplitCTA title="REQUEST A BRIEF" href="/contact" />
              </div>
            </motion.div>
          </div>

          {/* Right — nav columns + scroll button */}
          <motion.div
            className="flex items-start gap-12"
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            id="footer-info"
          >
            {/* Navigate */}
            <motion.div
              variants={fade}
              className="flex flex-col gap-5 min-w-[160px] border-l border-[#f6f6f2]/20 pl-5"
              id="footer-col-navigate"
            >
              <span className="button-mono text-xs font-medium uppercase tracking-[0.15em] text-[#f6f6f2]/40">
                Navigate
              </span>
              <ul className="flex flex-col">
                {[
                  { label: 'Services', href: '/services' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Our Team', href: '/team' },
                  { label: 'Contact', href: '/contact' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className={`font-sans text-sm sm:text-base transition-colors duration-300 ${
                        pathname === href
                          ? 'text-white'
                          : 'text-[#f6f6f2]/70 hover:text-white'
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Connect */}
            <motion.div
              variants={fade}
              className="flex flex-col gap-5 min-w-[160px] border-l border-[#f6f6f2]/20 pl-5"
              id="footer-col-connect"
            >
              <span className="button-mono text-xs font-medium uppercase tracking-[0.15em] text-[#f6f6f2]/40">
                Connect
              </span>
              <ul className="flex flex-col">
                {[
                  {
                    label: 'LinkedIn',
                    href: 'https://www.linkedin.com/company/sn-international-group',
                  },
                  { label: 'info@sngroup.com.au', href: 'mailto:info@sngroup.com.au' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-sans text-sm sm:text-base text-[#f6f6f2]/70 hover:text-white transition-colors duration-300"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Scroll to top */}
            <motion.a
              variants={fade}
              href="#app-wrapper"
              onClick={handleScrollToTop}
              aria-label="Scroll to top of the page"
              className="group hidden md:block ml-auto relative w-12 h-12 rounded-lg border border-[#f6f6f2]/30 group-hover:border-transparent cursor-pointer shrink-0 overflow-hidden transition-[border-color] duration-[750ms] delay-0 group-hover:delay-[150ms]"
              id="footer-scroll-btn"
            >
              <div className="absolute top-0 left-0 w-full flex flex-col transition-transform duration-[750ms] ease-[cubic-bezier(0.19,1,0.22,1)] delay-0 group-hover:delay-[150ms] group-hover:-translate-y-12">
                <div className="flex items-center justify-center w-12 h-12 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      transform="rotate(-90, 12, 12)"
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="rgba(246,246,242,0.4)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className="flex items-center justify-center w-12 h-12 shrink-0 bg-white rounded-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      transform="rotate(-90, 12, 12)"
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="#0c1d2e"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
            </motion.a>
          </motion.div>
        </div>

        {/* ── Wordmark ── */}
        <motion.div
          className="w-full overflow-hidden"
          id="footer-wordmark"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.p
            className="w-full font-sans font-medium text-white whitespace-nowrap leading-none tracking-tight select-none"
            style={{ fontSize: 'clamp(32px, 14vw, 190px)' }}
            variants={{
              hidden: { y: '100%' },
              visible: {
                y: 0,
                transition: { duration: 1.2, delay: 0.2, ease: [0.19, 1, 0.22, 1] },
              },
            }}
            aria-hidden
          >
            SN International
          </motion.p>
        </motion.div>

        {/* ── Credits ── */}
        <div className="pb-6" id="footer-bottom">
          <span className="button-mono text-xs text-white tracking-[0.05em]">
            &copy; 2026 SN INTERNATIONAL GROUP. ALL RIGHTS RESERVED.
          </span>
        </div>
      </div>
    </footer>
  );
}
