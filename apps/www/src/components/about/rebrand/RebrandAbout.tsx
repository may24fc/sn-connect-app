'use client';

import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import Footer from '../../home/rebrand/Footer';
import Navbar from '../../home/rebrand/Navbar';
import AboutCard from './AboutCard';
import AboutHero from './AboutHero';
import OurStorySection from './OurStorySection';
import VisionSection from './VisionSection';

export default function RebrandAbout() {
  useSmoothScroll();

  return (
    <div className="rebrand-about w-full bg-[#d6e4f0]" id="app-wrapper">
      <Navbar alwaysLogoPill />

      <AboutHero />

      <OurStorySection />

      <AboutCard />

      <div className="bg-[#0c1d2e]">
        <VisionSection />
      </div>

      <Footer />
    </div>
  );
}
