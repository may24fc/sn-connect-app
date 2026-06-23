import type { Metadata } from 'next';
import RebrandAbout from '@/components/about/rebrand/RebrandAbout';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'About',
  description: `Learn how ${COMPANY.name} builds managed offshore support teams with structured onboarding, dependable delivery, and role matching built for fast-moving businesses.`,
};

export default function AboutPage() {
  return <RebrandAbout />;
}
