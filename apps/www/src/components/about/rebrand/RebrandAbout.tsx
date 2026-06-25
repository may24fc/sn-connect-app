'use client';

import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import Navbar from '../../home/rebrand/Navbar';
import Footer from '../../home/rebrand/Footer';
import AboutHero from './AboutHero';
import AboutCard from './AboutCard';
import VisionSection from './VisionSection';

export default function RebrandAbout() {
  useSmoothScroll();

  return (
    <div className="rebrand-about w-full bg-[#d6e4f0]" id="app-wrapper">
      <Navbar alwaysLogoPill />

      <AboutHero />

      <AboutCard />

      <div className="bg-[#0c1d2e]">
        <VisionSection />
      </div>

      <Footer />
    </div>
  );
}
