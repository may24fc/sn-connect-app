'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function AdminReportsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const user = useRequireAuth(['admin', 'super_admin']);

  if (!user) {
    return null;
  }

  return <>{children}</>;
}