'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAtsAccess } from '@/hooks/useAtsAccess';
import { EmptyState } from '@hr-portal/ui';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export default function AtsLayout({ children }: { children: ReactNode }): ReactNode {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useAtsAccess(true);
  const fallbackPath = user?.role === 'associate' ? '/associate/dashboard' : '/dashboard';

  useEffect(() => {
    if (!isLoading && !data?.canAccess) {
      router.replace(fallbackPath);
    }
  }, [data?.canAccess, fallbackPath, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading ATS access...
        </div>
      </div>
    );
  }

  if (!data?.canAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title="ATS access required"
          description="Your account does not currently have ATS permissions. Contact HR to request access."
        />
      </div>
    );
  }

  return <>{children}</>;
}