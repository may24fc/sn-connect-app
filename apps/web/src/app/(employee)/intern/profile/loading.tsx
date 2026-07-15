import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Associate Profile page.
 */
export default function InternProfileLoading(): ReactNode {
  return <ProfilePageSkeleton />;
}
