'use client';

import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import Navbar from '../../home/rebrand/Navbar';
import Footer from '../../home/rebrand/Footer';
import ContactHero from './ContactHero';
import BookingCard from './BookingCard';
import MessageSection from './MessageSection';

interface RebrandContactProps {
  scheduleUrl: string | null;
  embedUrl: string | null;
}

export default function RebrandContact({ scheduleUrl, embedUrl }: RebrandContactProps) {
  useSmoothScroll();

  return (
    <div className="rebrand-contact w-full bg-[#d6e4f0]" id="app-wrapper">
      {/* Fixed navbar — same as home rebrand */}
      <Navbar alwaysLogoPill />

      {/* ── Hero ── full-height with large heading */}
      <ContactHero />

      {/* ── Booking discovery call section ── */}
      <BookingCard scheduleUrl={scheduleUrl} embedUrl={embedUrl} />

      {/* ── Message us — dark wrapper lets rounded-b-[2rem] show over footer bg ── */}
      <div className="bg-[#0c1d2e]">
        <MessageSection />
      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
