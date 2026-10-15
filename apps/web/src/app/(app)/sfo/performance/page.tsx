import { getCrmAuthedContext } from '@/app/api/crm/_lib';
import { getMarketingAuthedContext, hasMarketingAccess } from '@/app/api/marketing/_lib';
import { getRevenueForecastAuthedContext } from '@/app/api/revenue-forecast/_lib';
import { MarketingAdSpendDashboard } from '@/components/marketing/MarketingAdSpendDashboard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function SfoPerformancePage() {
  const auth = await getMarketingAuthedContext();
  if (!auth.ok || !hasMarketingAccess(auth.role, auth.hasAccessGrant)) return notFound();
  const revenueAccess =
    auth.role === 'super_admin'
      ? true
      : auth.role === 'admin'
        ? false
        : (await getRevenueForecastAuthedContext()).ok;
  const crm = await getCrmAuthedContext();
  if (!crm.ok && crm.status >= 500) throw new Error('Could not check CRM access');
  const crmHref = crm.ok
    ? ['admin', 'super_admin'].includes(crm.context.role ?? '')
      ? '/admin/crm'
      : '/crm'
    : null;
  return (
    <main className="min-h-full space-y-6">
      <MarketingAdSpendDashboard
        initialTab="sales-comparison"
        sfoView
        revenueComparisonAccess={revenueAccess}
      />
      <section className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">CRM Tracker · unchanged</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The SFO proposal changes Ad Spend and Revenue, not the CRM. Leads and pipeline records
          remain in the existing tracker; ad spend alone cannot establish lead attribution or ROAS.
        </p>
        {crmHref ? (
          <Link
            href={crmHref}
            className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm font-semibold text-[#16505f] dark:text-cyan-300"
          >
            See current CRM screen
          </Link>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">CRM requires its own access grant.</p>
        )}
      </section>
    </main>
  );
}
