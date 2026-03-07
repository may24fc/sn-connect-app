import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HeroSection, WhatsNewMarquee } from '@/components/home/HeroSection';
import { BusinessCards } from '@/components/home/BusinessCards';

export const metadata: Metadata = {
  title: 'SN International Group — Building Futures, Empowering Lives',
};

export default function HomePage(): ReactNode {
  return (
    <>
      <HeroSection />
      <WhatsNewMarquee />
      <BusinessCards />
    </>
  );
}
