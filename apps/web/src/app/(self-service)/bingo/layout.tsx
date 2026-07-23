'use client';

import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import type { ReactNode } from 'react';

export default function BingoLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      {children}
    </SelfServiceLayoutShell>
  );
}