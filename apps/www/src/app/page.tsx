import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { BusinessCards } from '@/components/home/BusinessCards';

export const metadata: Metadata = {
  title: 'VA Outsourcing and Remote Support',
};

export default function HomePage(): ReactNode {
  return (
    <>
      <HeroSection />
      <BusinessCards />
    </>
  );
}
