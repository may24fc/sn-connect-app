'use client';

import { AdminOnboardingWizard } from '@/components/admin/AdminOnboardingWizard';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function AdminOnboardingSetupPage(): ReactNode {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'super_admin') return null;

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      <AdminOnboardingWizard userRole={user.role} />
    </div>
  );
}
