import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RebrandHome from '@/components/home/rebrand/RebrandHome';

export const metadata: Metadata = {
  title: 'VA Outsourcing and Remote Support',
};

export default function HomePage(): ReactNode {
  return <RebrandHome />;
}
