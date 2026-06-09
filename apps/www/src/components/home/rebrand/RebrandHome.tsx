'use client';

import { motion, useScroll } from 'framer-motion';
import { useRef } from 'react';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import SplitCTA from '../../ui/SplitCTA';
import Footer from './Footer';
import IntegratedPlatform from './IntegratedPlatform';
import IntroReveal from './IntroReveal';
import Navbar from './Navbar';
import OurCompany from './OurCompany';
import ScrollMarquee from './ScrollMarquee';
import SequenceBackground from './SequenceBackground';
import ThreeCards from './ThreeCards';
import WhatWeDo from './WhatWeDo';

export default function RebrandHome() {
  useSmoothScroll();
  const whatWeDoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: whatWeDoRef,
    offset: ['start start', 'end end'],
  });

  return (
    <div className="rebrand-home w-full bg-[#d6e4f0]" id="app-wrapper">
      <IntroReveal />
      <section className="relative w-full bg-[#f0f0f0]" id="hero-what-we-do-section">
        <div
          className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-[#d6e4f0]"
          id="hero-shared-background"
        >
          <SequenceBackground />
        </div>

        <div className="relative z-10 -mt-[100vh]">
          <section className="w-full min-h-screen" id="hero-section">
            <div className="w-full h-screen relative" id="hero-contents-layer">
              <div className="absolute top-0 left-0 right-0 z-20">
                <Navbar />
              </div>

              <div className="h-full flex flex-col justify-between px-6 sm:px-10 md:px-12 lg:px-12 pt-16 sm:pt-20 md:pt-28 lg:pt-[148px] pb-8 md:pb-11">
                <div id="hero-title-block">
                  <h1
                    className="text-4xl sm:text-6xl md:text-7xl lg:text-[112px] font-normal text-[#0c1d2e] tracking-tight leading-[0.95]"
                    id="hero-title"
                  >
                    {/* Each line masked so text slides up from beneath its own baseline */}
                    <div className="overflow-hidden pb-[0.05em]">
                      <motion.span
                        className="block"
                        initial={{ y: '110%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 1.1, delay: 1.2, ease: [0.19, 1, 0.22, 1] }}
                      >
                        Scale smarter with
                      </motion.span>
                    </div>
                    <div className="overflow-hidden pb-[0.05em]">
                      <motion.span
                        className="block"
                        initial={{ y: '110%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 1.1, delay: 1.38, ease: [0.19, 1, 0.22, 1] }}
                      >
                        AI-powered talent.
                      </motion.span>
                    </div>
                  </h1>
                </div>

                <div
                  className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
                  id="hero-bottom-row"
                >
                  <div className="overflow-hidden">
                    <motion.p
                      initial={{ y: '110%' }}
                      animate={{ y: 0 }}
                      transition={{ duration: 1.0, delay: 1.58, ease: [0.19, 1, 0.22, 1] }}
                      className="max-w-xl text-base sm:text-lg md:text-xl text-[#0c1d2e]/65 leading-relaxed"
                      id="hero-subtitle"
                    >
                      AI-enabled specialists across operations, marketing, support, and
                      technology—embedded into your team and ready to help your business scale
                      faster.
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.75, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <SplitCTA title="EXPLORE OUR SERVICES" href="#" />
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={whatWeDoRef}
            className="relative w-full h-[320vh]"
            id="what-we-do-scroll-root"
          >
            <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
              <div className="relative z-10 w-full h-full" id="what-we-do-contents-layer">
                <WhatWeDo scrollYProgress={scrollYProgress} />
              </div>
            </div>
          </section>
        </div>
      </section>

      <IntegratedPlatform />
      <ThreeCards />
      <ScrollMarquee />
      <div className="bg-[#0c1d2e]">
        <OurCompany />
      </div>
      <Footer />
    </div>
  );
}
