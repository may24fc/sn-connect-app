import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminOnboardingRedirectPage(): ReactNode {
  redirect('/admin/onboarding');
}
