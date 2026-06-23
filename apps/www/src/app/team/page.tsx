import type { Metadata } from 'next';
import RebrandTeam from '@/components/team/rebrand/RebrandTeam';

export const metadata: Metadata = {
  title: 'Our Team',
  description:
    'Meet the specialists, creatives, and operators behind SN International Group — placed with intent and built to deliver.',
};

export default function TeamPage() {
  return <RebrandTeam />;
}
