import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import type { ReactNode } from 'react';

/**
 * Route-level loading skeleton for the Super Admin Profile page.
 */
export default function SuperAdminProfileLoading(): ReactNode {
  return <ProfilePageSkeleton />;
}
