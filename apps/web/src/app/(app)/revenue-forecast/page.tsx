import { RevenueForecastPageContent } from '@/app/(app)/(admin)/super-admin/revenue-forecast/components/RevenueForecastPageContent';
import { getRevenueForecastAuthedContext } from '@/app/api/revenue-forecast/_lib';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RevenueForecastPage() {
  const auth = await getRevenueForecastAuthedContext();

  if (!auth.ok) {
    return notFound();
  }

  return (
    <RevenueForecastPageContent canManage={auth.context.role === 'super_admin'} />
  );
}
