import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminMonthlySelfEvaluationsRedirectPage(): ReactNode {
  redirect('/admin/performance/monthly-self-evaluations');
}