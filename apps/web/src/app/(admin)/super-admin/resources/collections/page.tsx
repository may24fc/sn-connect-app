import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminCollectionsRedirectPage(): ReactNode {
  redirect('/admin/resources/collections');
}