import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

type SuperAdminSelfEvaluationRedirectPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function SuperAdminSelfEvaluationRedirectPage({
  searchParams,
}: SuperAdminSelfEvaluationRedirectPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tab = resolvedSearchParams?.tab;

  if (tab === 'monthly' || tab === 'five-percent' || tab === 'quarterly') {
    redirect(`/admin/performance/self-evaluation?tab=${tab}`);
  }

  redirect('/admin/performance/self-evaluation');
}