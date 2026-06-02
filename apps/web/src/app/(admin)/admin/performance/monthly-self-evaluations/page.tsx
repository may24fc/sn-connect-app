import { SelfEvaluationReviewWorkspace } from '@/components/performance/SelfEvaluationReviewWorkspace';
import type { ReactNode } from 'react';

type MonthlySelfEvaluationsAdminPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MonthlySelfEvaluationsAdminPage({
  searchParams,
}: MonthlySelfEvaluationsAdminPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab === 'monthly-call-feedback'
      ? 'monthly-call-feedback'
      : resolvedSearchParams?.tab === 'quarterly'
        ? 'quarterly'
        : resolvedSearchParams?.tab === 'five-percent'
        ? 'five-percent'
        : 'monthly';

  return <SelfEvaluationReviewWorkspace defaultTab={defaultTab} />;
}
