import { UrlPaginationBar } from '@/components/data-display/UrlPaginationBar';
import { FinanceApproverSettings } from '@/components/finance/FinanceApproverSettings';
import { FinanceCatalogPanel } from '@/components/finance/FinanceCatalogPanel';
import { FinanceExpenseExport } from '@/components/finance/FinanceExpenseExport';
import { FinanceExpenseCorrection } from '@/components/finance/FinanceExpenseCorrection';
import { FinanceExpenseFilters } from '@/components/finance/FinanceExpenseFilters';
import { FinanceUnifiedReviewQueue } from '@/components/finance/FinanceUnifiedReviewQueue';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { formatFinanceDate } from '@/lib/format';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Button,
  tableHeaderClassName,
  tableHeadTextClassName,
  tabsListClassName,
  tabsTriggerClassName,
  PageTitle,
} from '@hr-portal/ui';
import { Plus } from 'lucide-react';

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
  receipt_document_id: string | null;
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
const statusBadge = (value: string | null) => {
  const base = 'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize';
  if (value === 'approved' || value === 'confirmed' || value === 'matched')
    return `${base} bg-emerald-100 text-emerald-800`;
  if (value === 'rejected' || value === 'variance_flagged')
    return `${base} bg-red-100 text-red-800`;
  if (value === 'unmatched' || value === 'unpaid')
    return `${base} bg-orange-100 text-orange-800`;
  return `${base} bg-amber-100 text-amber-900`;
};

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
  let totals: {
    count: number;
    convertedAud: number;
    totalsByCurrency: Array<{ currency: string; amount: number; entry_count: number }>;
  } | null = null;
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
        'id,transaction_date,vendor_name,category_code,expense_type,payment_source,payment_status,approval_state,match_status,total_amount,currency,total_amount_aud,source_system,source_type,business_justification,receipt_document_id',
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
    const totalResult = await (context.admin as any).rpc('finance_expense_filtered_totals', {
      target_month: month ? `${month}-01` : null,
      target_payment_source:
        tab === 'personal_card' || tab === 'company_card' ? tab : null,
      target_category: category || null,
      vendor_search: search || null,
    });
    if (totalResult.error) throw new Error('Could not load filtered expense totals');
    totals = totalResult.data;
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
    <main className="h-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageTitle>
            Expenses
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Requests, payments, subscriptions and reconciliation in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {tab !== 'review' && tab !== 'subscriptions' ? (
            <FinanceExpenseExport filters={params.toString()} />
          ) : null}
          {tab === 'subscriptions' ? (
            <Button asChild variant="outline">
              <Link
                href={`/finance/expenses?tab=subscriptions&month=${month || new Date().toISOString().slice(0, 7)}`}
              >
                Categories &amp; budgets
              </Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/expenses">
              <Plus strokeWidth={1.5} aria-hidden />
              New expense
            </Link>
          </Button>
        </div>
      </header>
      <section className="space-y-2">
        <nav aria-label="Expense views" className={tabsListClassName}>
          {tabs.map(([key, name]) => (
            <Link
              key={key}
              href={href(key, category)}
              aria-current={tab === key ? 'page' : undefined}
              className={tabsTriggerClassName}
            >
              {name}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
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
          <FinanceUnifiedReviewQueue />
        </>
      ) : tab === 'subscriptions' ? (
        <FinanceCatalogPanel
          key={month || 'current'}
          month={`${month || new Date().toISOString().slice(0, 7)}-01`}
        />
      ) : (
        <>
          <FinanceExpenseFilters
            month={month}
            search={search}
            category={category}
            categories={categories}
          />
          <section
            aria-label="Expense ledger"
            className="overflow-x-auto rounded-xl border bg-card"
          >
            {totals ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-3 text-sm">
                <strong>{totals.count} expenses</strong>
                {totals.totalsByCurrency.map((item) => (
                  <span key={item.currency}>{money(Number(item.amount), item.currency)}</span>
                ))}
                <span className="text-muted-foreground">
                  {money(Number(totals.convertedAud), 'AUD')} converted total
                </span>
              </div>
            ) : null}
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
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
                    'Receipt',
                    'Actions',
                  ].map((title) => (
                    <th key={title} scope="col" className={title === 'Actions' ? 'p-3 text-right' : 'p-3'}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3 tabular-nums">{formatFinanceDate(row.transaction_date)}</td>
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
                      <span className={statusBadge(row.approval_state)}>{label(row.approval_state)}</span>
                    </td>
                    <td className="p-3">
                      <span className={statusBadge(row.payment_status)}>{label(row.payment_status)}</span>
                    </td>
                    <td className="p-3">
                      <span className={statusBadge(row.match_status)}>{row.match_status === 'variance_flagged' ? 'Amount differs' : label(row.match_status)}</span>
                    </td>
                    <td className="p-3">{row.receipt_document_id ? 'Attached' : 'Awaiting'}</td>
                    <td className="p-3 text-right">
                      <FinanceExpenseCorrection id={row.id} paymentSource={row.payment_source} paymentStatus={row.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No expenses match these filters.</p>
            ) : null}
          </section>
          <UrlPaginationBar
            page={page}
            totalPages={Math.ceil(count / 50)}
            total={count}
            pageSize={50}
            itemLabel="expenses"
          />
        </>
      )}
    </main>
  );
}
