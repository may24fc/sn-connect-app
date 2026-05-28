import { SelfEvaluationWorkspace } from '@/components/performance/SelfEvaluationWorkspace';
import type { ReactNode } from 'react';

type AdminSelfEvaluationPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminSelfEvaluationPage({
  searchParams,
}: AdminSelfEvaluationPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab === 'quarterly'
      ? 'quarterly'
      : resolvedSearchParams?.tab === 'five-percent'
        ? 'five-percent'
        : 'monthly';

  return (
    <SelfEvaluationWorkspace
      defaultTab={defaultTab}
      backHref="/admin/performance/monthly-self-evaluations"
      backLabel="Back to Reviews"
    />
  );
}