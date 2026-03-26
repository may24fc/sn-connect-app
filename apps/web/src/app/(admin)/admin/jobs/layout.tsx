'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

export default function JobsLayout({ children }: { children: ReactNode }): ReactNode {
  const user = useRequireAuth(['admin']);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
