import { RevenueForecastPageContent } from '@/app/(admin)/super-admin/revenue-forecast/components/RevenueForecastPageContent';
import { getRevenueForecastAuthedContext } from '@/app/api/revenue-forecast/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RevenueForecastPage() {
  const auth = await getRevenueForecastAuthedContext();

  if (!auth.ok) {
    return notFound();
  }

  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <RevenueForecastPageContent canManage={auth.context.role === 'super_admin'} />
    </SelfServiceLayoutShell>
  );
}
