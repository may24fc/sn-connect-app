import { notFound } from 'next/navigation';
import MarketingAdSpendPage from '@/app/(admin)/admin/marketing/ad-spend/page';
import { getMarketingAuthedContext } from '@/app/api/marketing/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';

export const dynamic = 'force-dynamic';

export default async function MarketingAdSpendSharedPage() {
  const auth = await getMarketingAuthedContext();

  if (!auth.ok) {
    return notFound();
  }

  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <MarketingAdSpendPage />
    </SelfServiceLayoutShell>
  );
}
