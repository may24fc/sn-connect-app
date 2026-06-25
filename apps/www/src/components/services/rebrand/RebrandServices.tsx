'use client';

import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import Navbar from '../../home/rebrand/Navbar';
import Footer from '../../home/rebrand/Footer';
import ServicesHero from './ServicesHero';
import PlatformCard from './PlatformCard';
import ServicesAccordion from './ServicesAccordion';

export default function RebrandServices() {
  useSmoothScroll();

  return (
    <div className="rebrand-services w-full bg-[#d6e4f0]" id="app-wrapper">
      <Navbar alwaysLogoPill />

      <ServicesHero />

      <PlatformCard />

      <div className="bg-[#0c1d2e]">
        <ServicesAccordion />
      </div>

      <Footer />
    </div>
  );
}
