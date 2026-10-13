import { FinancePropertiesPanel } from '@/components/finance/FinancePropertiesPanel';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
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
    <main className="h-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Property Development
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            Properties
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground lg:text-base">
            Live rent collection and maintenance register · AUD
          </p>
        </div>
        <form action="/property/properties" className="flex items-center gap-2 text-sm">
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
      <FinancePropertiesPanel month={month} />
    </main>
  );
}
