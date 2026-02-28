import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Employee Profile page.
 * Renders while the profile page chunk is being loaded.
 */
export default function ProfileLoading(): ReactNode {
  return <ProfilePageSkeleton />;
}
