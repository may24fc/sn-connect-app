import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { buildMonthlyExpenseReport } from '@/lib/expenses/monthly-report';

interface FakeRow {
  transaction_date: string;
  total_amount: number;
  total_amount_aud: number | null;
  currency: string;
  payment_status: string;
  expense_type: string | null;
  processing_status: string;
  match_status: string | null;
  risk_bucket: string | null;
  matched_variance_amount: number | null;
  vendor_name: string;
  department_id: string | null;
  department: { name: string | null } | null;
  employee: { department: string | null } | null;
}

function buildFakeAdminClient(rows: FakeRow[]) {
  const builder = {
    select: vi.fn(() => builder),
    is: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn((start: number, end: number) =>
      Promise.resolve({ data: rows.slice(start, end + 1), error: null, count: rows.length })
    ),
  };

  return {
    from: vi.fn(() => builder),
  } as unknown as Parameters<typeof buildMonthlyExpenseReport>[0];
}

function row(overrides: Partial<FakeRow>): FakeRow {
  return {
    transaction_date: '2026-06-15',
    total_amount: 100,
    total_amount_aud: 100,
    currency: 'AUD',
    payment_status: 'confirmed',
    expense_type: 'software',
    processing_status: 'approved',
    match_status: 'unmatched',
    risk_bucket: null,
    matched_variance_amount: null,
    vendor_name: 'Sample Vendor',
    department_id: 'dept-1',
    department: { name: 'Marketing' },
    employee: { department: 'Marketing' },
    ...overrides,
  };
}

describe('buildMonthlyExpenseReport', () => {
  const referenceDate = new Date('2026-07-06T00:00:00Z');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('computes MoM summary metrics and category/department breakdowns', async () => {
    const rows: FakeRow[] = [
      // Current month (July 2026): two entries, one flagged anomaly
      row({ transaction_date: '2026-07-02', total_amount_aud: 300, expense_type: 'software' }),
      row({
        transaction_date: '2026-07-10',
        total_amount_aud: 100,
        expense_type: 'travel',
        match_status: 'variance_flagged',
        matched_variance_amount: 25,
        department: { name: 'Accounting' },
        employee: { department: 'Accounting' },
        processing_status: 'draft_extracted',
      }),
      // Previous month (June 2026): one entry
      row({ transaction_date: '2026-06-15', total_amount_aud: 200, expense_type: 'software' }),
    ];

    const adminClient = buildFakeAdminClient(rows);
    const report = await buildMonthlyExpenseReport(adminClient, referenceDate);

    expect(report.reportMonthLabel).toBe('July 2026');
    expect(report.currentRangeStart).toBe('2026-07-01');
    expect(report.currentRangeEndInclusive).toBe('2026-07-31');
    expect(report.previousRangeStart).toBe('2026-06-01');
    expect(report.previousRangeEndInclusive).toBe('2026-06-30');

    const totalSpend = report.summary.find((m) => m.metric === 'Total Spend (AUD)');
    expect(totalSpend?.currentMonth).toBe(400);
    expect(totalSpend?.previousMonth).toBe(200);
    expect(totalSpend?.momPercentChange).toBe(100);

    const average = report.summary.find((m) => m.metric === 'Average Spend Per Entry');
    expect(average?.currentMonth).toBe(200);
    expect(average?.previousMonth).toBe(200);
    expect(average?.momPercentChange).toBe(0);

    expect(report.categoryBreakdown).toEqual([
      { category: 'software', spendAud: 300, percentOfTotal: 75 },
      { category: 'travel', spendAud: 100, percentOfTotal: 25 },
    ]);

    expect(report.departmentBreakdown).toEqual([
      { departmentName: 'Marketing', spendAud: 300, momVariationPercent: 50 },
      { departmentName: 'Accounting', spendAud: 100, momVariationPercent: null },
    ]);

    expect(report.pipelineStatus).toEqual({
      autoApproved: 0,
      awaitingAssociateReview: 0,
      approved: 1,
      draftExtracted: 1,
    });

    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0]).toMatchObject({
      vendorName: 'Sample Vendor',
      transactionDate: '2026-07-10',
      totalAmountAud: 100,
      varianceAmountAud: 25,
      reason: 'variance_flagged',
    });
  });

  it('omits anomalies entirely when no entries are flagged', async () => {
    const rows: FakeRow[] = [row({ transaction_date: '2026-07-05', total_amount_aud: 50 })];
    const adminClient = buildFakeAdminClient(rows);

    const report = await buildMonthlyExpenseReport(adminClient, referenceDate);

    expect(report.anomalies).toEqual([]);
  });

  it('lists unknown confirmations and excludes unconverted currency from AUD spend', async () => {
    const report = await buildMonthlyExpenseReport(
      buildFakeAdminClient([
        row({
          transaction_date: '2026-07-05',
          total_amount_aud: null,
          total_amount: 20,
          currency: 'USD',
          payment_status: 'unknown',
        }),
      ]),
      referenceDate
    );
    expect(report.summary[0]?.currentMonth).toBe(0);
    expect(report.unknownPayments).toEqual([
      {
        vendorName: 'Sample Vendor',
        transactionDate: '2026-07-05',
        currency: 'USD',
        amount: 20,
      },
    ]);
  });

  it('includes direct payments beyond the first 1,000-row page', async () => {
    const entries = Array.from({ length: 1001 }, () =>
      row({ transaction_date: '2026-07-05', total_amount: 1, total_amount_aud: 1 })
    );
    const report = await buildMonthlyExpenseReport(buildFakeAdminClient(entries), referenceDate);
    expect(report.summary[0]?.currentMonth).toBe(1001);
    expect(report.paymentStatusCounts.confirmed).toBe(1001);
  });
});
