'use client';

import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import type { ReactNode } from 'react';

export default function MyPerformanceLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'intern', 'admin', 'super_admin']}>
      {children}
    </SelfServiceLayoutShell>
  );
}