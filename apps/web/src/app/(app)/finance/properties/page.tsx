import { FinancePropertiesPanel } from '@/components/finance/FinancePropertiesPanel';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FinancePropertiesPage({
  searchParams,
}: { searchParams: Promise<{ month?: string }> }) {
  const context = await getFinanceContext();
  if (!(context.ok && canReviewFinance(context.capabilities))) return notFound();
  const query = await searchParams;
  if (query.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) return notFound();
  const month = query.month ?? new Date().toISOString().slice(0, 7);
  return (
    <main className="mx-auto max-w-7xl space-y-5 bg-[#f5f6f4] p-4 text-[#10191c] md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1f6a7c]">Finance</p>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground">
            Live rent collection and maintenance register · AUD
          </p>
        </div>
        <form action="/finance/properties" className="flex items-center gap-2 text-sm">
          <label htmlFor="property-month">Month</label>
          <input
            id="property-month"
            name="month"
            type="month"
            required
            defaultValue={month}
            className="rounded-md border bg-card px-3 py-2"
          />
          <button type="submit" className="rounded-md border bg-card px-3 py-2 font-medium">
            View
          </button>
        </form>
      </header>
      <nav aria-label="Finance pages" className="flex flex-wrap gap-2 text-sm">
        <Link href="/finance" className="rounded-md border bg-card px-3 py-2">
          Overview
        </Link>
        <Link href="/finance/expenses" className="rounded-md border bg-card px-3 py-2">
          Expenses
        </Link>
        <Link href="/finance/staff-payments" className="rounded-md border bg-card px-3 py-2">
          Staff Payments
        </Link>
        <Link href="/finance/reports" className="rounded-md border bg-card px-3 py-2">
          Reports
        </Link>
      </nav>
      <FinancePropertiesPanel month={month} />
    </main>
  );
}
