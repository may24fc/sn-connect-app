import ExpenseAnalyticsDashboardPage from '@/app/(app)/(admin)/admin/expenses/analytics/page';
import { FinanceDetailDisclosure } from '@/components/finance/FinanceDetailDisclosure';
import { FinanceReportControls } from '@/components/finance/FinanceReportControls';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type FinanceOverviewData, summarizeFinanceOverview } from '@/lib/finance/overview';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
const money = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`)
  );

export default async function FinanceReportsPage({
  searchParams,
}: { searchParams: Promise<{ month?: string; view?: string }> }) {
  const context = await getFinanceContext();
  if (!(context.ok && canReviewFinance(context.capabilities))) return notFound();
  const query = await searchParams;
  if (query.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) return notFound();
  if (query.view !== undefined && !['month', 'week', 'quarter', 'year'].includes(query.view))
    return notFound();
  const month = query.month ?? new Date().toISOString().slice(0, 7);
  const view = query.view ?? 'month';
  const prior = new Date(`${month}-01T00:00:00Z`);
  prior.setUTCMonth(prior.getUTCMonth() - 1);
  const previous = prior.toISOString().slice(0, 7);
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
  if (currentResult.error || !currentResult.data || previousResult.error || !previousResult.data)
    throw new Error('Could not load Finance report comparison');
  const current = currentResult.data;
  const earlier = previousResult.data;
  const summary = summarizeFinanceOverview(current, earlier);
  const priorByCode = new Map(
    earlier.categoryBudgets.map((row) => [row.code, Number(row.spent_aud)])
  );
  const rows = current.categoryBudgets
    .map((row) => ({
      code: row.code,
      name: row.name,
      current: Number(row.spent_aud),
      previous: priorByCode.get(row.code) ?? 0,
      budget: row.budget_aud === null ? null : Number(row.budget_aud),
    }))
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort((a, b) => b.current - a.current);
  const chartMax = Math.max(1, ...rows.flatMap((row) => [row.current, row.previous]));
  const largest = [...rows].sort((a, b) => b.current + b.previous - a.current - a.previous)[0];
  type TrendRow = {
    bucket_start: string;
    bucket_end: string;
    spend_aud: number;
    converted_count: number;
    unconverted_count: number;
  };
  const trendResult =
    view === 'month'
      ? null
      : await (context.admin as any).rpc('finance_spend_trend', {
          anchor_month: `${month}-01`,
          granularity: view,
        });
  if (trendResult?.error) throw new Error('Could not load Finance spend trend');
  const trendRows = (trendResult?.data ?? []) as Array<TrendRow>;
  const trendMax = Math.max(1, ...trendRows.map((row) => Number(row.spend_aud)));

  return (
    <main className="h-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Finance
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            Reports
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground lg:text-base">
            Compare converted spending and prepare an auditable month-end report.
          </p>
        </div>
        <form action="/finance/reports" className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="report-month">Month</label>
          <input
            id="report-month"
            name="month"
            type="month"
            required
            defaultValue={month}
            className="rounded-md border bg-card px-3 py-2"
          />
          <label htmlFor="report-view">Trend</label>
          <select
            id="report-view"
            name="view"
            defaultValue={view}
            className="rounded-md border bg-card px-3 py-2"
          >
            <option value="month">Month</option>
            <option value="week">Weeks in month</option>
            <option value="quarter">Quarters in year</option>
            <option value="year">Last four years</option>
          </select>
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
      </nav>
      {view !== 'month' ? (
        <section className="rounded-xl border bg-card p-5" aria-label="Finance spend trend">
          <h2 className="font-semibold">
            {view === 'week' ? 'Weekly' : view === 'quarter' ? 'Quarterly' : 'Yearly'} recorded
            spend
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Converted AUD direct payments only. The month-end report pack below remains for{' '}
            {monthLabel(month)}.
          </p>
          <div className="space-y-3">
            {trendRows.map((row) => (
              <div
                key={row.bucket_start}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm"
              >
                <span>
                  {row.bucket_start} to{' '}
                  {new Date(`${row.bucket_end}T00:00:00Z`).toISOString().slice(0, 10)} (end
                  exclusive)
                </span>
                <span className="tabular-nums">
                  {row.converted_count ? money(Number(row.spend_aud)) : 'No converted records'}
                  {row.unconverted_count ? ` · ${row.unconverted_count} awaiting FX` : ''}
                </span>
                <div
                  className="col-span-2 h-2 rounded-full bg-muted"
                  role="meter"
                  aria-label={`${row.bucket_start} spend`}
                  aria-valuenow={Number(row.spend_aud)}
                  aria-valuemin={0}
                  aria-valuemax={trendMax}
                >
                  <div
                    className="h-full rounded-full bg-[#2a78d6]"
                    style={{ width: `${(Number(row.spend_aud) / trendMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section
        aria-label="Monthly report highlights"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total spend</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {money(Number(current.recordedSpendAud) + Number(earlier.recordedSpendAud))}
          </p>
          <p className="text-xs text-muted-foreground">
            {monthLabel(previous)} + {monthLabel(month)} · converted AUD
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {monthLabel(month)} vs {monthLabel(previous)}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.changePercent === null
              ? '—'
              : `${summary.changePercent >= 0 ? '+' : ''}${summary.changePercent.toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.changePercent === null
              ? 'No prior AUD spend to compare'
              : `${money(Number(current.recordedSpendAud))} vs ${money(Number(earlier.recordedSpendAud))}`}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Largest category</p>
          <p className="mt-2 text-lg font-bold">{largest?.name ?? 'No spend recorded'}</p>
          <p className="text-xs text-muted-foreground">
            {largest
              ? `${money(largest.previous + largest.current)} over two months`
              : 'No converted expenses'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Awaiting conversion</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{current.unconvertedEntries}</p>
          <p className="text-xs text-muted-foreground">Not included in AUD totals</p>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="p-5">
            <h2 className="font-semibold">
              Spend by category: {monthLabel(previous)} vs {monthLabel(month)}
            </h2>
            <p className="text-xs text-muted-foreground">AUD · converted direct payments only</p>
          </div>
          {rows.length ? (
            <>
              <div className="flex gap-4 px-5 text-xs text-muted-foreground">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded bg-[#86b6ef]" />
                  {monthLabel(previous)}
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded bg-[#2a78d6]" />
                  {monthLabel(month)}
                </span>
              </div>
              <div className="overflow-x-auto px-4 py-5">
                <div
                  className="flex min-w-max items-end gap-4 border-b pb-1"
                  role="img"
                  aria-label={`Category spend comparison for ${monthLabel(previous)} and ${monthLabel(month)}`}
                >
                  {rows.map((row) => (
                    <div key={row.code} className="w-20 text-center">
                      <div className="flex h-40 items-end justify-center gap-1">
                        <div
                          className="w-5 rounded-t bg-[#86b6ef]"
                          style={{ height: `${(row.previous / chartMax) * 100}%` }}
                          title={`${row.name}: ${money(row.previous)} in ${monthLabel(previous)}`}
                        />
                        <div
                          className="w-5 rounded-t bg-[#2a78d6]"
                          style={{ height: `${(row.current / chartMax) * 100}%` }}
                          title={`${row.name}: ${money(row.current)} in ${monthLabel(month)}`}
                        />
                      </div>
                      <p className="mt-2 truncate text-[11px]" title={row.name}>
                        {row.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b bg-[#fafbf9] text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 text-right font-medium">{monthLabel(previous)}</th>
                      <th className="p-3 text-right font-medium">{monthLabel(month)}</th>
                      <th className="p-3 text-right font-medium">Change</th>
                      <th className="p-3 text-right font-medium">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.code} className="border-b last:border-0 hover:bg-[#fafbf9]">
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 text-right tabular-nums">{money(row.previous)}</td>
                        <td className="p-3 text-right tabular-nums">{money(row.current)}</td>
                        <td
                          className={`p-3 text-right tabular-nums ${row.current > row.previous ? 'text-red-700' : 'text-green-700'}`}
                        >
                          {row.previous === 0
                            ? 'New'
                            : `${row.current >= row.previous ? '+' : ''}${((row.current / row.previous - 1) * 100).toFixed(0)}%`}
                        </td>
                        <td
                          className={`p-3 text-right tabular-nums ${row.budget !== null && row.current > row.budget ? 'font-semibold text-red-700' : 'text-muted-foreground'}`}
                        >
                          {row.budget === null ? 'Not set' : money(row.budget)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              No converted direct payments in either month.
            </p>
          )}
        </section>
        <FinanceReportControls key={month} month={month} />
      </div>
      <FinanceDetailDisclosure
        title="Open detailed expense analytics"
        description="Detailed analytics have their own date controls; they do not change the selected month-end snapshot above."
      >
        <ExpenseAnalyticsDashboardPage />
      </FinanceDetailDisclosure>
    </main>
  );
}
