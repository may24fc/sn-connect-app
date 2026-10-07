import { type FinanceOverviewData, summarizeFinanceOverview } from '@/lib/finance/overview';
import { describe, expect, it } from 'vitest';

const previous: FinanceOverviewData = {
  month: '2026-05-01',
  recordedSpendAud: 100,
  unconvertedEntries: 0,
  categoryBudgets: [
    { code: 'tools', name: 'Tools', spent_aud: 60, budget_aud: null },
    { code: 'travel', name: 'Travel', spent_aud: 40, budget_aud: null },
  ],
  openMatches: 0,
  openVariances: 0,
  pendingApprovals: 0,
  submittedInvoices: 0,
  subscriptionRunRateAud: 0,
};

describe('finance overview presentation', () => {
  it('ranks converted spend, compares months and flags budgets only when exceeded', () => {
    const result = summarizeFinanceOverview(
      {
        ...previous,
        month: '2026-06-01',
        recordedSpendAud: 120,
        categoryBudgets: [
          { code: 'tools', name: 'Tools', spent_aud: 90, budget_aud: 90 },
          { code: 'travel', name: 'Travel', spent_aud: 20, budget_aud: 0 },
          { code: 'new', name: 'New', spent_aud: 10, budget_aud: null },
        ],
      },
      previous
    );
    expect(result.rankedCategories.map((row) => row.code)).toEqual(['tools', 'travel', 'new']);
    expect(result.budgetedCategories).toHaveLength(2);
    expect(result.overBudgetCount).toBe(1);
    expect(result.changePercent).toBeCloseTo(20);
    expect(result.changes.map((row) => row.delta)).toEqual([30, -20]);
  });

  it('does not invent a percent change when prior spend was zero', () => {
    expect(
      summarizeFinanceOverview(previous, { ...previous, recordedSpendAud: 0, categoryBudgets: [] })
        .changePercent
    ).toBeNull();
  });
});
