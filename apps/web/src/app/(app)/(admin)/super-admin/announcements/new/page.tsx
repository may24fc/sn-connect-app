import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminAnnouncementsNewRedirectPage(): ReactNode {
  redirect('/admin/announcements/new');
}
