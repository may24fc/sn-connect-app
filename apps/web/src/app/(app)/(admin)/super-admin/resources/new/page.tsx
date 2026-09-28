import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminResourcesNewRedirectPage(): ReactNode {
  redirect('/admin/resources/new');
}
