'use client';

import { EmptyState } from '@hr-portal/ui';
import { BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MarketingReportsAccessState({
  reason,
  fallbackHref,
}: {
  reason: 'non-employee' | 'non-marketing' | 'unauthenticated' | null;
  fallbackHref: string;
}) {
  const router = useRouter();

  const content =
    reason === 'non-employee'
      ? {
          title: 'Marketing Reports are not available for this account.',
          description:
            'This page is reserved for team members assigned to the Marketing department.',
        }
      : {
          title: 'Marketing Reports are only available to users in Marketing.',
          description:
            'If you need access, ask an admin to update your department assignment.',
        };

  return (
    <EmptyState
      icon={BarChart3}
      title={content.title}
      description={content.description}
      action={{
        label: 'Go to dashboard',
        onClick: () => router.push(fallbackHref),
      }}
      className="min-h-[320px]"
    />
  );
}