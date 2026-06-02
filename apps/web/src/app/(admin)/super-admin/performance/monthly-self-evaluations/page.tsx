import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

type SuperAdminMonthlySelfEvaluationsRedirectPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function SuperAdminMonthlySelfEvaluationsRedirectPage({
  searchParams,
}: SuperAdminMonthlySelfEvaluationsRedirectPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tab = resolvedSearchParams?.tab;

  if (
    tab === 'monthly' ||
    tab === 'monthly-call-feedback' ||
    tab === 'five-percent' ||
    tab === 'quarterly'
  ) {
    redirect(`/admin/performance/monthly-self-evaluations?tab=${tab}`);
  }

  redirect('/admin/performance/monthly-self-evaluations');
}