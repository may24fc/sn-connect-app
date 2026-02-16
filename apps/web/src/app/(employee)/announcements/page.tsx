import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function EmployeeAnnouncementsRedirectPage(): ReactNode {
  redirect('/information-hub');
}
