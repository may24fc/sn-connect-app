import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Admin Profile page.
 * Renders while the profile page chunk is being loaded.
 */
export default function AdminProfileLoading(): ReactNode {
  return <ProfilePageSkeleton />;
}
