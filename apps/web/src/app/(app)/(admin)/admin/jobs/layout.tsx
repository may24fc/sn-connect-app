'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function JobsLayout({ children }: { children: ReactNode }): ReactNode {
  const user = useRequireAuth(['admin']);

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
