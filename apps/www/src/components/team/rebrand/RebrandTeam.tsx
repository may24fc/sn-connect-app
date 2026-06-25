'use client';

import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import Navbar from '../../home/rebrand/Navbar';
import Footer from '../../home/rebrand/Footer';
import TeamHero from './TeamHero';
import TeamCard from './TeamCard';
import LeadershipSection from './LeadershipSection';
import StaffSection from './StaffSection';

export default function RebrandTeam() {
  useSmoothScroll();

  return (
    <div className="rebrand-team w-full bg-[#d6e4f0]" id="app-wrapper">
      <Navbar alwaysLogoPill />

      <TeamHero />

      <TeamCard />

      <div className="bg-[#0c1d2e]">
        <LeadershipSection />
        <StaffSection />
      </div>

      <Footer />
    </div>
  );
}
