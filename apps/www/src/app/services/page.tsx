import type { Metadata } from 'next';
import RebrandServices from '@/components/services/rebrand/RebrandServices';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Explore SN International Group\'s offshore support services — executive assistance, marketing support, content creation, and AI operations.',
};

export default function ServicesPage() {
  return <RebrandServices />;
}
