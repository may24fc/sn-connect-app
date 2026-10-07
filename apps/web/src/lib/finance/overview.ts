export type FinanceOverviewData = {
  month: string;
  recordedSpendAud: number;
  unconvertedEntries: number;
  categoryBudgets: Array<{
    code: string;
    name: string;
    spent_aud: number;
    budget_aud: number | null;
  }>;
  openMatches: number;
  openVariances: number;
  pendingApprovals: number;
  submittedInvoices: number;
  subscriptionRunRateAud: number;
};

export function summarizeFinanceOverview(
  current: FinanceOverviewData,
  previous: FinanceOverviewData
) {
  const categories = current.categoryBudgets.map((row) => ({
    ...row,
    spent_aud: Number(row.spent_aud),
    budget_aud: row.budget_aud === null ? null : Number(row.budget_aud),
  }));
  const rankedCategories = categories
    .filter((row) => row.spent_aud > 0)
    .sort((a, b) => b.spent_aud - a.spent_aud);
  const budgetedCategories = categories.filter(
    (row): row is typeof row & { budget_aud: number } => row.budget_aud !== null
  );
  const prior = new Map(previous.categoryBudgets.map((row) => [row.code, Number(row.spent_aud)]));
  const changes = categories
    .flatMap((row) => {
      const before = prior.get(row.code) ?? 0;
      return before > 0 && row.spent_aud > 0
        ? [
            {
              code: row.code,
              name: row.name,
              previous: before,
              current: row.spent_aud,
              delta: row.spent_aud - before,
            },
          ]
        : [];
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
  return {
    rankedCategories,
    budgetedCategories,
    changes,
    overBudgetCount: budgetedCategories.filter((row) => row.spent_aud > row.budget_aud).length,
    changePercent:
      Number(previous.recordedSpendAud) > 0
        ? (Number(current.recordedSpendAud) / Number(previous.recordedSpendAud) - 1) * 100
        : null,
  };
}
