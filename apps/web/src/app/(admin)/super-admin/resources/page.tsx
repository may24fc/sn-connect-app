import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminResourcesRedirectPage(): ReactNode {
  redirect('/admin/resources');
}
