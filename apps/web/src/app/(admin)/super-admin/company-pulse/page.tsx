import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminCompanyPulseRedirectPage(): ReactNode {
  redirect('/admin/company-pulse');
}