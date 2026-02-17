import { redirect } from 'next/navigation';

export default function AnalyticsRedirectPage() {
  redirect('/admin/reports?tab=analytics');
}
