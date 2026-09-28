import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminDirectoryRedirectPage(): ReactNode {
  redirect('/admin/directory');
}