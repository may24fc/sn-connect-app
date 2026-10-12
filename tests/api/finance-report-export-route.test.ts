import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isAccounting: boolean }) => capabilities.isAccounting,
}));

import { GET } from '@/app/api/finance/reports/export/route';
import { getFinanceContext } from '@/lib/finance/auth';
import { parseCsv } from '@/lib/finance/csv';

const snapshotId = '11111111-1111-4111-8111-111111111111';
const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
const request = (month = '2026-06') =>
  new NextRequest(
    `http://localhost/api/finance/reports/export?month=${month}&snapshot=${snapshotId}`
  );

describe('Finance saved report CSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isAccounting: true },
      admin: { from: vi.fn(() => query) },
    } as never);
  });

  it('exports saved current and prior breakdowns, pipeline states, and escaped exceptions', async () => {
    query.single.mockResolvedValue({
      error: null,
      data: {
        status: 'draft',
        exception_count: 1,
        report_data: {
          summary: [{ metric: 'Total', currentMonth: 30, previousMonth: 20, momPercentChange: 50 }],
          categoryBreakdown: [{ category: 'Travel', spendAud: 30, percentOfTotal: 100 }],
          previousCategoryBreakdown: [{ category: 'Software', spendAud: 20 }],
          departmentBreakdown: [
            { departmentName: 'Operations', spendAud: 30, momVariationPercent: null },
          ],
          previousDepartmentBreakdown: [{ departmentName: 'Sales', spendAud: 20 }],
          pipelineStatus: {
            autoApproved: 1,
            awaitingAssociateReview: 2,
            approved: 3,
            draftExtracted: 4,
          },
          anomalies: [
            {
              vendorName: '=BAD()',
              transactionDate: '2026-06-10',
              totalAmountAud: 30,
              varianceAmountAud: null,
              reason: 'price_spike',
            },
          ],
          paymentStatusCounts: { unknown: 1, unpaid: 0, confirmed: 2 },
          subscriptionsAsOfSnapshot: [
            {
              id: 'sub-1',
              vendor_name: '=Canva',
              active: true,
              payment_source: 'company_card',
              monthly_amount_aud: 25,
              seats: 3,
              next_renewal: '2026-07-01',
              last_charged: null,
            },
          ],
          wiseImportRowsForMonth: [
            {
              payment_reference: 'ref-1',
              result: 'failed',
              detail: 'Needs review',
              imported_at: '2026-06-18T00:00:00Z',
              resolved_at: null,
            },
          ],
        },
      },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toContain(snapshotId);
    const rows = parseCsv(await response.text());
    expect(rows).toContainEqual(['Category', 'Software', '0', '20', '0', '']);
    expect(rows).toContainEqual(['Department', 'Sales', '0', '20', '', '']);
    expect(rows).toContainEqual(['Pipeline status', 'awaitingAssociateReview', '2', '', '', '']);
    expect(rows).toContainEqual(['Exception', "'=BAD()", '30', '', '2026-06-10', 'price_spike']);
    expect(rows).toContainEqual([
      'Direct-payment status',
      'unknown',
      '1',
      '',
      '2026-06',
      'Status at snapshot time',
    ]);
    expect(rows).toContainEqual([
      'Subscription register as of snapshot',
      "'=Canva",
      '25',
      'company_card',
      '2026-07-01',
      'active=true; seats=3; last linked charge=none',
    ]);
    expect(rows).toContainEqual([
      'Wise result imported in month',
      'ref-1',
      'failed',
      '2026-06-18T00:00:00Z',
      '',
      'Needs review',
    ]);
    expect(query.eq).toHaveBeenCalledWith('report_month', '2026-06-01');
  });

  it('rejects malformed requests, unauthorized access, and unsupported saved data', async () => {
    expect((await GET(request('2026-13'))).status).toBe(400);
    vi.mocked(getFinanceContext).mockResolvedValueOnce({
      ok: true,
      capabilities: { isAccounting: false },
    } as never);
    expect((await GET(request())).status).toBe(403);
    query.single.mockResolvedValueOnce({
      error: null,
      data: { status: 'draft', exception_count: 0, report_data: {} },
    });
    expect((await GET(request())).status).toBe(422);
    query.single.mockResolvedValueOnce({ error: { message: 'missing' }, data: null });
    expect((await GET(request())).status).toBe(404);
  });
});
