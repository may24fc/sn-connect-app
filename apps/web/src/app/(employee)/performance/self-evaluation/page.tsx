import { SelfEvaluationWorkspace } from '@/components/performance/SelfEvaluationWorkspace';
import type { ReactNode } from 'react';

type SelfEvaluationPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MonthlySelfEvaluationPage({
  searchParams,
}: SelfEvaluationPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab === 'monthly-call-feedback'
      ? 'monthly-call-feedback'
      : resolvedSearchParams?.tab === 'quarterly'
        ? 'quarterly'
        : resolvedSearchParams?.tab === 'five-percent'
        ? 'five-percent'
        : 'monthly';

  return <SelfEvaluationWorkspace defaultTab={defaultTab} />;
}
