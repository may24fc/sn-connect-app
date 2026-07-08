import type { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface MonthlyMetricComparison {
  metric: string;
  currentMonth: number;
  previousMonth: number;
  momPercentChange: number | null;
}

export interface CategorySpendRow {
  category: string;
  spendAud: number;
  percentOfTotal: number;
}

export interface DepartmentSpendRow {
  departmentName: string;
  spendAud: number;
  momVariationPercent: number | null;
}

export interface PipelineStatusCounts {
  autoApproved: number;
  awaitingInternReview: number;
  approved: number;
  draftExtracted: number;
}

export interface AnomalyRow {
  vendorName: string;
  transactionDate: string;
  totalAmountAud: number;
  varianceAmountAud: number | null;
  reason: 'variance_flagged' | 'price_spike';
}

export interface MonthlyExpenseReport {
  generatedAt: string;
  reportMonthLabel: string;
  currentRangeStart: string;
  currentRangeEndInclusive: string;
  previousRangeStart: string;
  previousRangeEndInclusive: string;
  summary: MonthlyMetricComparison[];
  categoryBreakdown: CategorySpendRow[];
  departmentBreakdown: DepartmentSpendRow[];
  pipelineStatus: PipelineStatusCounts;
  anomalies: AnomalyRow[];
}

type MonthlyReportRow = {
  transaction_date: string;
  total_amount: number;
  total_amount_aud: number | null;
  expense_type: string | null;
  processing_status: string;
  match_status: string | null;
  risk_bucket: string | null;
  matched_variance_amount: number | null;
  vendor_name: string;
  department_id: string | null;
  department: { name: string | null } | Array<{ name: string | null }> | null;
  employee: { department: string | null } | Array<{ department: string | null }> | null;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonthUtc(reference: Date): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function lastDayOfMonthUtc(monthStart: Date): Date {
  const nextMonth = addMonthsUtc(monthStart, 1);
  return new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);
}

function amountOf(row: MonthlyReportRow): number {
  return Number(row.total_amount_aud ?? row.total_amount ?? 0);
}

function resolveDepartmentName(row: MonthlyReportRow): string {
  const canonical = Array.isArray(row.department) ? row.department[0]?.name : row.department?.name;
  if (typeof canonical === 'string' && canonical.trim().length > 0) {
    return canonical;
  }

  const legacy = Array.isArray(row.employee) ? row.employee[0]?.department : row.employee?.department;
  if (typeof legacy === 'string' && legacy.trim().length > 0) {
    return legacy;
  }

  return 'Unassigned';
}

function momPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Determines the current and previous calendar month bounds (UTC) relative to
 * an optional reference date. Defaults to "now" so a scheduled job run on the
 * first Monday of a month reports on the just-completed prior month window.
 */
export function resolveMonthlyReportRange(referenceDate: Date = new Date()): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const currentStart = startOfMonthUtc(referenceDate);
  const currentEnd = lastDayOfMonthUtc(currentStart);
  const previousStart = addMonthsUtc(currentStart, -1);
  const previousEnd = lastDayOfMonthUtc(previousStart);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Aggregates expense_entries into the consolidated monthly executive report
 * structure: summary KPI comparison, category/department distributions,
 * audit pipeline status counts, and flagged anomalies only (no granular rows).
 */
export async function buildMonthlyExpenseReport(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  referenceDate: Date = new Date()
): Promise<MonthlyExpenseReport> {
  const { currentStart, currentEnd, previousStart, previousEnd } = resolveMonthlyReportRange(referenceDate);

  const { data, error } = await adminClient
    .from('expense_entries')
    .select(
      'transaction_date, total_amount, total_amount_aud, expense_type, processing_status, match_status, risk_bucket, matched_variance_amount, vendor_name, department_id, department:departments(name), employee:employees!expense_entries_employee_id_fkey(department)'
    )
    .is('deleted_at', null)
    .gte('transaction_date', toIsoDate(previousStart))
    .lte('transaction_date', toIsoDate(currentEnd))
    .order('transaction_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to load expense entries for monthly report: ${error.message}`);
  }

  const rows = (data ?? []) as MonthlyReportRow[];
  const currentStartIso = toIsoDate(currentStart);
  const currentEndIso = toIsoDate(currentEnd);
  const previousStartIso = toIsoDate(previousStart);
  const previousEndIso = toIsoDate(previousEnd);

  const currentRows = rows.filter((row) => row.transaction_date >= currentStartIso && row.transaction_date <= currentEndIso);
  const previousRows = rows.filter(
    (row) => row.transaction_date >= previousStartIso && row.transaction_date <= previousEndIso
  );

  const currentTotalSpend = currentRows.reduce((sum, row) => sum + amountOf(row), 0);
  const previousTotalSpend = previousRows.reduce((sum, row) => sum + amountOf(row), 0);
  const currentEntryCount = currentRows.length;
  const previousEntryCount = previousRows.length;
  const currentAverage = currentEntryCount > 0 ? currentTotalSpend / currentEntryCount : 0;
  const previousAverage = previousEntryCount > 0 ? previousTotalSpend / previousEntryCount : 0;

  const summary: MonthlyMetricComparison[] = [
    {
      metric: 'Total Spend (AUD)',
      currentMonth: round2(currentTotalSpend),
      previousMonth: round2(previousTotalSpend),
      momPercentChange: momPercent(currentTotalSpend, previousTotalSpend),
    },
    {
      metric: 'Total Ledger Entries',
      currentMonth: currentEntryCount,
      previousMonth: previousEntryCount,
      momPercentChange: momPercent(currentEntryCount, previousEntryCount),
    },
    {
      metric: 'Average Spend Per Entry',
      currentMonth: round2(currentAverage),
      previousMonth: round2(previousAverage),
      momPercentChange: momPercent(currentAverage, previousAverage),
    },
  ];

  const categoryTotals = new Map<string, number>();
  for (const row of currentRows) {
    const key = row.expense_type || 'other';
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + amountOf(row));
  }

  const categoryBreakdown: CategorySpendRow[] = Array.from(categoryTotals.entries())
    .map(([category, spendAud]) => ({
      category,
      spendAud: round2(spendAud),
      percentOfTotal: currentTotalSpend > 0 ? round2((spendAud / currentTotalSpend) * 100) : 0,
    }))
    .sort((a, b) => b.spendAud - a.spendAud);

  const currentDepartmentTotals = new Map<string, number>();
  for (const row of currentRows) {
    const key = resolveDepartmentName(row);
    currentDepartmentTotals.set(key, (currentDepartmentTotals.get(key) ?? 0) + amountOf(row));
  }

  const previousDepartmentTotals = new Map<string, number>();
  for (const row of previousRows) {
    const key = resolveDepartmentName(row);
    previousDepartmentTotals.set(key, (previousDepartmentTotals.get(key) ?? 0) + amountOf(row));
  }

  const departmentBreakdown: DepartmentSpendRow[] = Array.from(currentDepartmentTotals.entries())
    .map(([departmentName, spendAud]) => ({
      departmentName,
      spendAud: round2(spendAud),
      momVariationPercent: momPercent(spendAud, previousDepartmentTotals.get(departmentName) ?? 0),
    }))
    .sort((a, b) => b.spendAud - a.spendAud);

  const pipelineStatus: PipelineStatusCounts = {
    autoApproved: currentRows.filter((row) => row.processing_status === 'auto_approved').length,
    awaitingInternReview: currentRows.filter((row) => row.processing_status === 'awaiting_intern_review').length,
    approved: currentRows.filter((row) => row.processing_status === 'approved').length,
    draftExtracted: currentRows.filter((row) => row.processing_status === 'draft_extracted').length,
  };

  const anomalies: AnomalyRow[] = currentRows
    .filter((row) => row.match_status === 'variance_flagged' || row.risk_bucket === 'price_spike')
    .map((row): AnomalyRow => ({
      vendorName: row.vendor_name,
      transactionDate: row.transaction_date,
      totalAmountAud: round2(amountOf(row)),
      varianceAmountAud: row.matched_variance_amount !== null ? round2(Number(row.matched_variance_amount)) : null,
      reason: row.match_status === 'variance_flagged' ? 'variance_flagged' : 'price_spike',
    }))
    .sort((a, b) => Math.abs(b.varianceAmountAud ?? 0) - Math.abs(a.varianceAmountAud ?? 0));

  return {
    generatedAt: new Date().toISOString(),
    reportMonthLabel: currentStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    currentRangeStart: currentStartIso,
    currentRangeEndInclusive: currentEndIso,
    previousRangeStart: previousStartIso,
    previousRangeEndInclusive: previousEndIso,
    summary,
    categoryBreakdown,
    departmentBreakdown,
    pipelineStatus,
    anomalies,
  };
}
