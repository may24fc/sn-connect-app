import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type FinanceOverviewData, summarizeFinanceOverview } from '@/lib/finance/overview';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const money = (amount: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`)
  );

export default async function FinanceOverview({
  searchParams,
}: { searchParams: Promise<{ month?: string }> }) {
  const context = await getFinanceContext();
  if (!(context.ok && canReviewFinance(context.capabilities))) return notFound();
  const query = await searchParams;
  if (query.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) return notFound();
  const month = query.month ?? new Date().toISOString().slice(0, 7);
  const previousMonth = new Date(`${month}-01T00:00:00Z`);
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  const previous = previousMonth.toISOString().slice(0, 7);
  const db = context.admin as unknown as {
    rpc: (
      name: 'finance_overview',
      args: { target_month: string }
    ) => Promise<{ data: FinanceOverviewData | null; error: { message: string } | null }>;
  };
  const [currentResult, previousResult] = await Promise.all([
    db.rpc('finance_overview', { target_month: `${month}-01` }),
    db.rpc('finance_overview', { target_month: `${previous}-01` }),
  ]);
  if (currentResult.error || !currentResult.data || previousResult.error || !previousResult.data) {
    throw new Error('Could not load Finance overview');
  }
  const summary = currentResult.data;
  const comparison = summarizeFinanceOverview(summary, previousResult.data);
  const maxCategorySpend = comparison.rankedCategories[0]?.spent_aud ?? 1;
  const tasks = [
    {
      label: 'Requests to match',
      count: summary.openMatches,
      href: '/finance/expenses?tab=review',
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Amount differences',
      count: summary.openVariances,
      href: '/finance/expenses?tab=review',
      color: 'text-red-700 bg-red-50',
    },
    ...(comparison.budgetedCategories.length
      ? [
          {
            label: 'Budgets over limit',
            count: comparison.overBudgetCount,
            href: '#budgets',
            color: 'text-red-700 bg-red-50',
          },
        ]
      : []),
    {
      label: 'Pending expense approvals',
      count: summary.pendingApprovals,
      href: '/finance/expenses?tab=review',
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Submitted invoices',
      count: summary.submittedInvoices,
      href: '/finance/staff-payments',
      color: 'text-teal-700 bg-teal-50',
    },
  ];

  return (
    <main className="h-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Finance
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            Overview
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground lg:text-base">
            What needs your attention, and where the money went this month.
          </p>
        </div>
        <form action="/finance" className="flex items-center gap-2 text-sm">
          <label htmlFor="finance-month">Month</label>
          <input
            id="finance-month"
            name="month"
            type="month"
            required
            defaultValue={month}
            className="rounded-md border bg-card px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-md border bg-card px-3 py-2 font-medium hover:bg-muted"
          >
            View
          </button>
        </form>
      </header>
      <nav aria-label="Finance pages" className="flex flex-wrap gap-2 text-sm">
        <Link
          className="rounded-md border bg-card px-3 py-2 hover:bg-muted"
          href="/finance/expenses"
        >
          Expenses
        </Link>
        <Link
          className="rounded-md border bg-card px-3 py-2 hover:bg-muted"
          href="/finance/staff-payments"
        >
          Staff Payments
        </Link>
        <Link
          className="rounded-md border bg-card px-3 py-2 hover:bg-muted"
          href="/finance/reports"
        >
          Reports
        </Link>
      </nav>
      <p className="text-xs text-muted-foreground">Open items across all months</p>
      <section
        aria-label="Finance action queue"
        className={`grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 ${tasks.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}
      >
        {tasks.map((task) => (
          <Link
            key={task.label}
            href={task.href}
            className="flex items-center gap-3 border-b p-4 last:border-0 hover:bg-muted/50 sm:border-r lg:border-b-0"
          >
            <span
              className={`flex h-10 min-w-10 items-center justify-center rounded-lg text-xl font-bold tabular-nums ${task.color}`}
            >
              {task.count}
            </span>
            <span className="text-sm text-muted-foreground">{task.label}</span>
          </Link>
        ))}
      </section>
      <section
        aria-label="Monthly finance totals"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Recorded spend · {monthLabel(month)}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{money(summary.recordedSpendAud)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {comparison.changePercent === null
              ? `No comparable AUD spend in ${monthLabel(previous)}`
              : `${comparison.changePercent >= 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}% vs ${monthLabel(previous)} (${money(previousResult.data.recordedSpendAud)})`}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Subscription run rate</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {money(summary.subscriptionRunRateAud)}
            <span className="text-sm font-normal text-muted-foreground"> / mo</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {money(summary.subscriptionRunRateAud * 12)} a year at this rate
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Amounts awaiting FX conversion</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{summary.unconvertedEntries}</p>
          <p className="mt-1 text-xs text-muted-foreground">Excluded from AUD spend totals</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Categories with spend</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {comparison.rankedCategories.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Of {summary.categoryBudgets.length} categories
          </p>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="rounded-xl border bg-card p-5 lg:col-span-5">
          <h2 className="font-semibold">Recorded spend by payment source</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {monthLabel(month)} · converted AUD direct payments
          </p>
          <dl className="space-y-2 text-sm">
            {[
              ['Personal card', summary.paymentSourceSpendAud?.personalCard ?? 0],
              ['Company card', summary.paymentSourceSpendAud?.companyCard ?? 0],
              ['Bank transfer', summary.paymentSourceSpendAud?.bankTransfer ?? 0],
              ['Source unknown', summary.paymentSourceSpendAud?.unknown ?? 0],
            ].map(([label, amount]) => (
              <div key={label} className="flex justify-between gap-3 border-b py-1 last:border-0">
                <dt>{label}</dt>
                <dd className="tabular-nums">{money(Number(amount))}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-xl border bg-card p-5 lg:col-span-7">
          <h2 className="font-semibold">Scheduled subscription renewals</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Dates recorded for {monthLabel(month)} · payment is not confirmed by this schedule
          </p>
          {summary.scheduledRenewals?.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {summary.scheduledRenewals.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap justify-between gap-2 border-b py-2 last:border-0"
                >
                  <span>
                    {item.vendor_name} · {item.next_renewal}
                  </span>
                  <span className="tabular-nums">
                    {item.monthly_amount_aud === null
                      ? 'Amount not set'
                      : money(item.monthly_amount_aud)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No subscription renewals dated this month.
            </p>
          )}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <section
          className={`rounded-xl border bg-card p-5 ${comparison.budgetedCategories.length ? 'lg:col-span-7' : 'lg:col-span-12'}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Spend by category</h2>
              <p className="text-xs text-muted-foreground">
                {monthLabel(month)} · AUD amounts with a known conversion
              </p>
            </div>
            <Link
              className="text-sm font-medium text-teal-700 hover:underline"
              href="/finance/expenses"
            >
              View expenses
            </Link>
          </div>
          {comparison.rankedCategories.length ? (
            <div className="space-y-4">
              {comparison.rankedCategories.map((row) => (
                <div
                  key={row.code}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="text-right tabular-nums">
                    {money(row.spent_aud)}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({Math.round((row.spent_aud / summary.recordedSpendAud) * 100)}%)
                    </span>
                  </span>
                  <div
                    className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-label={`${row.name} share of recorded spend`}
                    aria-valuenow={Math.round((row.spent_aud / summary.recordedSpendAud) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-teal-700"
                      style={{ width: `${(row.spent_aud / maxCategorySpend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No converted direct payments recorded this month.
            </p>
          )}
        </section>
        {comparison.budgetedCategories.length ? (
          <section id="budgets" className="rounded-xl border bg-card p-5 lg:col-span-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Budgets</h2>
                <p className="text-xs text-muted-foreground">
                  Monthly limits · {monthLabel(month)}
                </p>
              </div>
              <Link
                className="text-sm font-medium text-teal-700 hover:underline"
                href={`/finance/expenses?tab=subscriptions&month=${month}`}
              >
                Edit limits
              </Link>
            </div>
            <div className="space-y-5">
              {comparison.budgetedCategories.map((row) => (
                <BudgetMeter key={row.code} row={row} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Biggest changes vs {monthLabel(previous)}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Categories with converted spend in both months
        </p>
        {comparison.changes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">{monthLabel(previous)}</th>
                  <th className="pb-2 text-right font-medium">{monthLabel(month)}</th>
                  <th className="pb-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {comparison.changes.map((row) => (
                  <tr key={row.code} className="border-b last:border-0">
                    <td className="py-3">{row.name}</td>
                    <td className="py-3 text-right tabular-nums">{money(row.previous)}</td>
                    <td className="py-3 text-right tabular-nums">{money(row.current)}</td>
                    <td
                      className={`py-3 text-right tabular-nums ${row.delta > 0 ? 'text-red-700' : 'text-green-700'}`}
                    >
                      {row.delta > 0 ? '+' : ''}
                      {money(row.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No categories have comparable spend in both months.
          </p>
        )}
      </section>
    </main>
  );
}

function BudgetMeter({
  row,
}: { row: { code: string; name: string; spent_aud: number; budget_aud: number } }) {
  const used =
    row.budget_aud === 0 ? (row.spent_aud > 0 ? 100 : 0) : (row.spent_aud / row.budget_aud) * 100;
  const exceeded = row.spent_aud > row.budget_aud;
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="font-medium">{row.name}</span>
        <span className={exceeded ? 'font-semibold text-red-700' : 'text-muted-foreground'}>
          {money(row.spent_aud)} of {money(row.budget_aud)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${row.name} budget used`}
        aria-valuenow={Math.min(Math.round(used), 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${exceeded ? 'bg-red-600' : used >= 90 ? 'bg-amber-500' : 'bg-teal-700'}`}
          style={{ width: `${Math.min(used, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {exceeded
          ? `Over by ${money(row.spent_aud - row.budget_aud)}`
          : used >= 90
            ? 'Near limit'
            : 'On track'}
      </p>
    </div>
  );
}
