import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: () => true,
}));
vi.mock('@/app/(app)/(admin)/admin/expenses/page', () => ({ default: () => null }));
vi.mock('@/app/(app)/(admin)/admin/expenses/analytics/page', () => ({ default: () => null }));
vi.mock('@/components/finance/FinanceApprovalQueue', () => ({ FinanceApprovalQueue: () => null }));
vi.mock('@/components/finance/FinanceApproverSettings', () => ({
  FinanceApproverSettings: () => null,
}));
vi.mock('@/components/finance/FinanceCatalogPanel', () => ({ FinanceCatalogPanel: () => null }));
vi.mock('@/components/finance/FinanceReportControls', () => ({
  FinanceReportControls: ({ month }: { month: string }) => <span>Report pack {month}</span>,
}));
vi.mock('@/components/finance/FinanceExpenseExport', () => ({ FinanceExpenseExport: () => null }));
vi.mock('@/components/finance/FinancePropertiesPanel', () => ({
  FinancePropertiesPanel: ({ month }: { month: string }) => <span>Live properties {month}</span>,
}));

import FinanceExpenses from '@/app/(app)/finance/expenses/page';
import FinancePropertiesPage from '@/app/(app)/finance/properties/page';
import FinanceReportsPage from '@/app/(app)/finance/reports/page';
import { getFinanceContext } from '@/lib/finance/auth';

const overview = (month: string, spend: number) => ({
  month,
  recordedSpendAud: spend,
  unconvertedEntries: 1,
  categoryBudgets: [
    { code: 'travel', name: 'Travel', spent_aud: spend, budget_aud: 90 },
    { code: 'other', name: 'Other', spent_aud: 0, budget_aud: null },
  ],
  openMatches: 0,
  openVariances: 0,
  pendingApprovals: 0,
  submittedInvoices: 0,
  subscriptionRunRateAud: 0,
});

describe('Finance redesign pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the selected month in the live properties register with no prototype figures', async () => {
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true, capabilities: { isLeadership: true },
    } as never);
    const html = renderToStaticMarkup(
      await FinancePropertiesPage({ searchParams: Promise.resolve({ month: '2026-06' }) })
    );
    expect(html).toContain('Live properties 2026-06');
    expect(html).toContain('Live rent collection and maintenance register');
    expect(html).not.toContain('Phase 2');
  });

  it('shows the selected reporting month and comparison without prototype figures', async () => {
    const rpc = vi.fn(async (_name: string, args: { target_month: string }) => ({
      data: overview(args.target_month, args.target_month === '2026-06-01' ? 120 : 80),
      error: null,
    }));
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isLeadership: true },
      admin: { rpc },
    } as never);
    const html = renderToStaticMarkup(
      await FinanceReportsPage({ searchParams: Promise.resolve({ month: '2026-06' }) })
    );
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(html).toContain('Spend by category: May 2026 vs June 2026');
    expect(html).toContain('Report pack 2026-06');
    expect(html).toContain('50.0%');
    expect(html).toContain('Open detailed expense analytics');
  });

  it('preserves selected filters and distinguishes currency and approval states', async () => {
    const categories = [{ code: 'travel', name: 'Travel' }];
    const entries = [
      {
        id: 'e1',
        transaction_date: '2026-06-12',
        vendor_name: 'Train',
        category_code: 'travel',
        expense_type: 'travel',
        payment_source: 'personal_card',
        total_amount: 100,
        currency: 'USD',
        total_amount_aud: null,
        source_system: null,
        source_type: 'direct_payment',
        business_justification: null,
        approval_state: 'pending',
        payment_status: 'unknown',
        match_status: 'unmatched',
      },
    ];
    const builder = (data: unknown) => {
      const query = Object.assign(Promise.resolve({ data, count: 1, error: null }), {
        select: vi.fn(),
        is: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        lt: vi.fn(),
        ilike: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
      });
      for (const key of ['select', 'is', 'eq', 'gte', 'lt', 'ilike', 'order', 'range'] as const)
        query[key].mockReturnValue(query);
      return query;
    };
    const from = vi.fn((table: string) =>
      builder(table === 'finance_categories' ? categories : entries)
    );
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isLeadership: true },
      admin: { from },
    } as never);
    const html = renderToStaticMarkup(
      await FinanceExpenses({
        searchParams: Promise.resolve({
          tab: 'personal_card',
          category: 'travel',
          month: '2026-06',
          q: 'Train',
        }),
      })
    );
    expect(html).toContain('Expense categories');
    expect(html).toContain('tab=personal_card&amp;month=2026-06&amp;category=travel&amp;q=Train');
    expect(html).toContain('AUD conversion pending');
    expect(html).toContain('pending');
    expect(html).toContain('unmatched');
  });
});
