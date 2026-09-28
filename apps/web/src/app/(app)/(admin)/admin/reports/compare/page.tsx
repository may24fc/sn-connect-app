import { redirect } from 'next/navigation';

export default function CompareRedirectPage() {
  redirect('/admin/reports?tab=compare');
}
