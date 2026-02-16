import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminCollectionsNewRedirectPage(): ReactNode {
  redirect('/admin/resources/collections/new');
}