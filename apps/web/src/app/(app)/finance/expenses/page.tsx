import AdminExpensesDashboard from '@/app/(app)/(admin)/admin/expenses/page';
import { FinanceApprovalQueue } from '@/components/finance/FinanceApprovalQueue';
import { FinanceApproverSettings } from '@/components/finance/FinanceApproverSettings';
import { FinanceCatalogPanel } from '@/components/finance/FinanceCatalogPanel';
import { FinanceExpenseExport } from '@/components/finance/FinanceExpenseExport';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const tabs = [
  ['all', 'All expenses'],
  ['personal_card', 'Personal card'],
  ['company_card', 'Company card'],
  ['subscriptions', 'Subscriptions'],
  ['review', 'To review'],
] as const;

type ExpenseRow = {
  id: string;
  transaction_date: string;
  vendor_name: string;
  category_code: string | null;
  expense_type: string | null;
  payment_source: string | null;
  payment_status: string | null;
  approval_state: string | null;
  match_status: string | null;
  total_amount: number;
  currency: string;
  total_amount_aud: number | null;
  source_system: string | null;
  source_type: string;
  business_justification: string | null;
};

type Category = { code: string; name: string };
type FinanceQuery<T> = PromiseLike<{
  data: Array<T> | null;
  count: number | null;
  error: { message: string } | null;
}> & {
  select: (columns: string, options?: { count: 'exact' }) => FinanceQuery<T>;
  order: (column: string, options?: { ascending: boolean }) => FinanceQuery<T>;
  is: (column: string, value: null) => FinanceQuery<T>;
  eq: (column: string, value: string) => FinanceQuery<T>;
  gte: (column: string, value: string) => FinanceQuery<T>;
  lt: (column: string, value: string) => FinanceQuery<T>;
  ilike: (column: string, value: string) => FinanceQuery<T>;
  range: (start: number, end: number) => FinanceQuery<T>;
};
type FinanceLedgerClient = {
  from(table: 'finance_categories'): FinanceQuery<Category>;
  from(table: 'expense_entries'): FinanceQuery<ExpenseRow>;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
const label = (value: string | null) => (value ?? 'unknown').replaceAll('_', ' ');
const badge =
  'inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground';

export default async function FinanceExpenses({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    month?: string;
    category?: string;
    q?: string;
  }>;
}) {
  const context = await getFinanceContext();
  if (!(context.ok && canReviewFinance(context.capabilities))) return notFound();
  const query = await searchParams;
  if (query.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) return notFound();
  const month = query.month || '';
  const tab = tabs.find(([key]) => key === query.tab)?.[0] ?? 'all';
  const page = Math.max(1, Math.min(1000, Number.parseInt(query.page ?? '1', 10) || 1));
  const db = context.admin as unknown as FinanceLedgerClient;
  let rows: Array<ExpenseRow> = [];
  let count = 0;
  let categories: Array<Category> = [];
  const category = query.category ?? '';
  const search = query.q?.trim() ?? '';
  if (search.length > 100) return notFound();
  if (tab !== 'review' && tab !== 'subscriptions') {
    const categoryResult = await db
      .from('finance_categories')
      .select('code,name')
      .order('sort_order');
    if (categoryResult.error) throw new Error('Could not load finance categories');
    categories = categoryResult.data ?? [];
    if (category && !categories.some((item) => item.code === category)) return notFound();
    let ledger = db
      .from('expense_entries')
      .select(
        'id,transaction_date,vendor_name,category_code,expense_type,payment_source,payment_status,approval_state,match_status,total_amount,currency,total_amount_aud,source_system,source_type,business_justification',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false });
    if (tab === 'personal_card' || tab === 'company_card')
      ledger = ledger.eq('payment_source', tab);
    if (category) ledger = ledger.eq('category_code', category);
    if (search) ledger = ledger.ilike('vendor_name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
    if (month) {
      const end = new Date(`${month}-01T00:00:00Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      ledger = ledger
        .gte('transaction_date', `${month}-01`)
        .lt('transaction_date', end.toISOString().slice(0, 10));
    }
    const result = await ledger.range((page - 1) * 50, page * 50 - 1);
    if (result.error) throw new Error('Could not load expense ledger');
    rows = result.data ?? [];
    count = result.count ?? 0;
  }
  const params = new URLSearchParams({ tab });
  if (month) params.set('month', month);
  if (category) params.set('category', category);
  if (search) params.set('q', search);
  const href = (tabValue: string, categoryValue = '') => {
    const next = new URLSearchParams({ tab: tabValue });
    if (month) next.set('month', month);
    if (categoryValue && tabValue !== 'review' && tabValue !== 'subscriptions')
      next.set('category', categoryValue);
    if (search && tabValue !== 'review' && tabValue !== 'subscriptions') next.set('q', search);
    return `/finance/expenses?${next}`;
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 bg-[#f5f6f4] p-4 text-[#10191c] md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1f6a7c]">Finance</p>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Requests, payments, subscriptions and reconciliation in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {tab !== 'review' && tab !== 'subscriptions' ? (
            <FinanceExpenseExport filters={params.toString()} />
          ) : null}
          {tab === 'subscriptions' ? (
            <Link
              href={`/finance/expenses?tab=subscriptions&month=${month || new Date().toISOString().slice(0, 7)}`}
              className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold"
            >
              Categories &amp; budgets
            </Link>
          ) : null}
          <Link
            href="/expenses"
            className="rounded-lg bg-[#16505f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f6a7c]"
          >
            New expense
          </Link>
        </div>
      </header>
      <nav aria-label="Finance pages" className="flex flex-wrap gap-2 text-sm">
        <Link href="/finance" className="rounded-md border bg-card px-3 py-2">
          Overview
        </Link>
        <Link href="/finance/staff-payments" className="rounded-md border bg-card px-3 py-2">
          Staff Payments
        </Link>
        <Link href="/finance/reports" className="rounded-md border bg-card px-3 py-2">
          Reports
        </Link>
        <Link href="/finance/properties" className="rounded-md border bg-card px-3 py-2">
          Properties
        </Link>
      </nav>
      <section className="rounded-xl border bg-card px-4 pb-3 pt-1">
        <nav aria-label="Expense views" className="flex flex-wrap gap-1 border-b">
          {tabs.map(([key, name]) => (
            <Link
              key={key}
              href={href(key, category)}
              aria-current={tab === key ? 'page' : undefined}
              className={`border-b-2 px-3 py-3 text-sm font-medium ${tab === key ? 'border-[#16505f] text-[#0f3f4b]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {name}
            </Link>
          ))}
        </nav>
        <p className="pt-3 text-xs text-muted-foreground">
          {tab === 'review'
            ? 'Match requests, resolve differences, then decide ordinary approvals.'
            : tab === 'subscriptions'
              ? 'Recurring service details live here; actual charges appear in All expenses and are not counted twice.'
              : 'Approval, payment and matching are separate states. Values retain their original currency.'}
        </p>
      </section>
      {tab === 'review' ? (
        <>
          {context.capabilities.role === 'super_admin' ? <FinanceApproverSettings /> : null}
          <FinanceApprovalQueue />
          <section
            aria-label="Reconciliation workbench"
            className="[&>div]:!max-h-none [&>div]:!bg-transparent [&>div]:!p-0 [&>div>div:first-child]:hidden"
          >
            <AdminExpensesDashboard />
          </section>
        </>
      ) : tab === 'subscriptions' ? (
        <FinanceCatalogPanel
          key={month || 'current'}
          month={`${month || new Date().toISOString().slice(0, 7)}-01`}
        />
      ) : (
        <>
          <section aria-label="Expense filters" className="rounded-xl border bg-card p-4">
            <form action="/finance/expenses" className="flex flex-wrap items-end gap-3 text-sm">
              <input type="hidden" name="tab" value={tab} />
              <label className="space-y-1">
                Month{' '}
                <input
                  name="month"
                  type="month"
                  defaultValue={month}
                  className="block rounded-md border bg-background px-3 py-2"
                />
              </label>
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <label className="space-y-1">
                Vendor{' '}
                <input
                  name="q"
                  type="search"
                  maxLength={100}
                  defaultValue={search}
                  placeholder="Search vendor…"
                  className="block rounded-md border bg-background px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-[#16505f] px-4 py-2 font-semibold text-white"
              >
                Apply filters
              </button>
              <Link href={`/finance/expenses?tab=${tab}`} className="rounded-md border px-4 py-2">
                Clear filters
              </Link>
            </form>
            <nav
              aria-label="Expense categories"
              className="mt-4 flex flex-wrap gap-2 border-t pt-4"
            >
              {[{ code: '', name: 'All' }, ...categories].map((item) => (
                <Link
                  key={item.code}
                  href={href(tab, item.code)}
                  aria-current={category === item.code ? 'page' : undefined}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item.code ? 'border-[#16505f] bg-[#16505f] text-white' : 'bg-white text-[#4a5558] hover:bg-[#e6f0f1]'}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </section>
          <section
            aria-label="Expense ledger"
            className="overflow-x-auto rounded-xl border bg-card"
          >
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b bg-[#fafbf9] text-xs uppercase tracking-wide text-[#838c8e]">
                <tr>
                  {[
                    'Date',
                    'Expense',
                    'Category',
                    'Paid with',
                    'Amount',
                    'Approval',
                    'Payment',
                    'Match',
                  ].map((title) => (
                    <th key={title} scope="col" className="p-3 font-semibold">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3 tabular-nums">{row.transaction_date}</td>
                    <td className="p-3">
                      <span className="font-medium">{row.vendor_name}</span>
                      {row.source_system === 'ai_spending' ? (
                        <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-900">
                          AI spend
                        </span>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        {row.source_type === 'staff_request' ? 'Request' : 'Direct payment'}
                        {row.business_justification ? ` · ${row.business_justification}` : ''}
                      </div>
                    </td>
                    <td className="p-3 capitalize">
                      {categories.find((item) => item.code === row.category_code)?.name ??
                        label(row.category_code ?? row.expense_type)}
                    </td>
                    <td className="p-3 capitalize">{label(row.payment_source)}</td>
                    <td className="whitespace-nowrap p-3 tabular-nums">
                      {money(Number(row.total_amount), row.currency)}
                      {row.currency !== 'AUD' ? (
                        <div className="text-xs text-muted-foreground">
                          {row.total_amount_aud === null
                            ? 'AUD conversion pending'
                            : `≈ ${money(Number(row.total_amount_aud), 'AUD')}`}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span className={badge}>{label(row.approval_state)}</span>
                    </td>
                    <td className="p-3">
                      <span className={badge}>{label(row.payment_status)}</span>
                    </td>
                    <td className="p-3">
                      <span className={badge}>{label(row.match_status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No expenses match these filters.</p>
            ) : null}
          </section>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>
              {count} matching expenses · page {page}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  className="rounded border px-3 py-1"
                  href={`/finance/expenses?${params}&page=${page - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {page * 50 < count ? (
                <Link
                  className="rounded border px-3 py-1"
                  href={`/finance/expenses?${params}&page=${page + 1}`}
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
