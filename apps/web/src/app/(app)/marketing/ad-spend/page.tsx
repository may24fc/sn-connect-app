import { notFound } from 'next/navigation';
import { MarketingAdSpendDashboard } from '@/components/marketing/MarketingAdSpendDashboard';
import { getMarketingAuthedContext } from '@/app/api/marketing/_lib';

export const dynamic = 'force-dynamic';

export default async function MarketingAdSpendSharedPage() {
  const auth = await getMarketingAuthedContext();

  if (!auth.ok) {
    return notFound();
  }

  return (
    <MarketingAdSpendDashboard />
  );
}
