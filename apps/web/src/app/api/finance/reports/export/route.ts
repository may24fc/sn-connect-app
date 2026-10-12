import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { writeCsv } from '@/lib/finance/csv';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  snapshot: z.string().uuid(),
});
const snapshotSchema = z.object({
  status: z.enum(['draft', 'final']),
  exception_count: z.number(),
  report_data: z.object({
    summary: z.array(
      z.object({
        metric: z.string(),
        currentMonth: z.number(),
        previousMonth: z.number(),
        momPercentChange: z.number().nullable(),
      })
    ),
    categoryBreakdown: z.array(
      z.object({
        category: z.string(),
        spendAud: z.number(),
        percentOfTotal: z.number(),
      })
    ),
    previousCategoryBreakdown: z.array(
      z.object({
        category: z.string(),
        spendAud: z.number(),
      })
    ),
    departmentBreakdown: z.array(
      z.object({
        departmentName: z.string(),
        spendAud: z.number(),
        momVariationPercent: z.number().nullable(),
      })
    ),
    previousDepartmentBreakdown: z.array(
      z.object({
        departmentName: z.string(),
        spendAud: z.number(),
      })
    ),
    pipelineStatus: z.object({
      autoApproved: z.number(),
      awaitingAssociateReview: z.number(),
      approved: z.number(),
      draftExtracted: z.number(),
    }),
    anomalies: z.array(
      z.object({
        vendorName: z.string(),
        transactionDate: z.string(),
        totalAmountAud: z.number(),
        varianceAmountAud: z.number().nullable(),
        reason: z.string(),
      })
    ),
    unknownPayments: z
      .array(
        z.object({
          vendorName: z.string(),
          transactionDate: z.string(),
          currency: z.string(),
          amount: z.number(),
        })
      )
      .optional(),
    paymentStatusCounts: z
      .object({ unknown: z.number(), unpaid: z.number(), confirmed: z.number() })
      .optional(),
    subscriptionsAsOfSnapshot: z
      .array(
        z.object({
          id: z.string(),
          vendor_name: z.string(),
          active: z.boolean(),
          payment_source: z.string(),
          monthly_amount_aud: z.number().nullable(),
          seats: z.number().nullable(),
          next_renewal: z.string().nullable(),
          last_charged: z.string().nullable(),
        })
      )
      .optional(),
    wiseImportRowsForMonth: z
      .array(
        z.object({
          payment_reference: z.string().nullable(),
          result: z.string(),
          detail: z.string().nullable(),
          imported_at: z.string(),
          resolved_at: z.string().nullable(),
        })
      )
      .optional(),
  }),
});

export async function GET(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = paramsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid report export' }, { status: 400 });

  const { month, snapshot } = parsed.data;
  const result = await context.admin
    .from('finance_report_snapshots')
    .select('status,exception_count,report_data')
    .eq('id', snapshot)
    .eq('report_month', `${month}-01`)
    .single();
  if (result.error || !result.data)
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  const saved = snapshotSchema.safeParse(result.data);
  if (!saved.success)
    return NextResponse.json({ error: 'Saved report format is not supported' }, { status: 422 });

  const { status, exception_count: exceptions, report_data: report } = saved.data;
  const previousCategorySpend = new Map(
    report.previousCategoryBreakdown.map((row) => [row.category, row.spendAud])
  );
  const previousDepartmentSpend = new Map(
    report.previousDepartmentBreakdown.map((row) => [row.departmentName, row.spendAud])
  );
  const currentCategories = new Set(report.categoryBreakdown.map((row) => row.category));
  const currentDepartments = new Set(report.departmentBreakdown.map((row) => row.departmentName));
  const csv = writeCsv([
    ['Report month', month, 'Snapshot status', status, 'Flagged exceptions', String(exceptions)],
    ['Section', 'Item', 'Current month', 'Previous month', 'Change / share', 'Detail'],
    ...report.summary.map((row) => [
      'Summary',
      row.metric,
      String(row.currentMonth),
      String(row.previousMonth),
      row.momPercentChange === null ? '' : String(row.momPercentChange),
      '',
    ]),
    ...report.categoryBreakdown.map((row) => [
      'Category',
      row.category,
      String(row.spendAud),
      String(previousCategorySpend.get(row.category) ?? 0),
      String(row.percentOfTotal),
      '',
    ]),
    ...report.previousCategoryBreakdown
      .filter((row) => !currentCategories.has(row.category))
      .map((row) => ['Category', row.category, '0', String(row.spendAud), '0', '']),
    ...report.departmentBreakdown.map((row) => [
      'Department',
      row.departmentName,
      String(row.spendAud),
      String(previousDepartmentSpend.get(row.departmentName) ?? 0),
      row.momVariationPercent === null ? '' : String(row.momVariationPercent),
      '',
    ]),
    ...report.previousDepartmentBreakdown
      .filter((row) => !currentDepartments.has(row.departmentName))
      .map((row) => ['Department', row.departmentName, '0', String(row.spendAud), '', '']),
    ...Object.entries(report.pipelineStatus).map(([state, count]) => [
      'Pipeline status',
      state,
      String(count),
      '',
      '',
      '',
    ]),
    ...report.anomalies.map((row) => [
      'Exception',
      row.vendorName,
      String(row.totalAmountAud),
      row.varianceAmountAud === null ? '' : String(row.varianceAmountAud),
      row.transactionDate,
      row.reason,
    ]),
    ...(report.unknownPayments ?? []).map((row) => [
      'Unknown payment confirmation',
      row.vendorName,
      String(row.amount),
      row.currency,
      row.transactionDate,
      'Listed without blocking finalization',
    ]),
    ...Object.entries(report.paymentStatusCounts ?? {}).map(([status, count]) => [
      'Direct-payment status',
      status,
      String(count),
      '',
      month,
      'Status at snapshot time',
    ]),
    ...(report.subscriptionsAsOfSnapshot ?? []).map((row) => [
      'Subscription register as of snapshot',
      row.vendor_name,
      row.monthly_amount_aud === null ? '' : String(row.monthly_amount_aud),
      row.payment_source,
      row.next_renewal ?? '',
      `active=${row.active}; seats=${row.seats ?? 'unknown'}; last linked charge=${row.last_charged ?? 'none'}`,
    ]),
    ...(report.wiseImportRowsForMonth ?? []).map((row) => [
      'Wise result imported in month',
      row.payment_reference ?? '',
      row.result,
      row.imported_at,
      row.resolved_at ?? '',
      row.detail ?? '',
    ]),
  ]);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finance-report-${month}-${status}-${snapshot}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
