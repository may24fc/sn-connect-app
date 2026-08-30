'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAiSpendingAccess } from '@/hooks/useAiSpendingAccess';
import { EmptyState } from '@hr-portal/ui';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export default function AiSpendingLayout({ children }: { children: ReactNode }): ReactNode {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useAiSpendingAccess(true);
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
          Loading AI Spending access...
        </div>
      </div>
    );
  }

  if (!data?.canAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title="AI Spending access required"
          description="Your account does not currently have AI Spending Tracker permissions. Contact an admin to request access."
        />
      </div>
    );
  }

  return <>{children}</>;
}
