import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function SuperAdminAnnouncementsRedirectPage(): ReactNode {
  redirect('/admin/announcements');
}
