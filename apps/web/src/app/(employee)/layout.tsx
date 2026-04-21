'use client';

import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import type { ReactNode } from 'react';

export default function EmployeeLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <SelfServiceLayoutShell allowedRoles={['employee', 'intern']}>{children}</SelfServiceLayoutShell>;
}
