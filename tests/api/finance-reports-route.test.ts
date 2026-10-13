import { POST } from '@/app/api/finance/reports/route';
import { buildMonthlyExpenseReport } from '@/lib/expenses/monthly-report';
import { getFinanceContext } from '@/lib/finance/auth';
import { buildFinanceReportPackSupplement } from '@/lib/finance/report-pack';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/expenses/monthly-report', () => ({ buildMonthlyExpenseReport: vi.fn() }));
vi.mock('@/lib/finance/report-pack', () => ({ buildFinanceReportPackSupplement: vi.fn() }));
vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isLeadership: boolean }) => capabilities.isLeadership,
}));

const request = (status: 'draft' | 'final') =>
  new NextRequest('http://localhost/api/finance/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: '2026-10', status }),
  });

describe('Finance report finalization policy', () => {
  const rpc = vi.fn(async () => ({ data: 'snapshot-id', error: null }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'actor' },
      capabilities: { isLeadership: true },
      admin: { rpc },
    } as never);
    vi.mocked(buildMonthlyExpenseReport).mockResolvedValue({ anomalies: [] } as never);
    vi.mocked(buildFinanceReportPackSupplement).mockResolvedValue({ unknownPayments: [] } as never);
  });

  it('pauses final snapshots while the complete blocking policy is pending', async () => {
    const response = await POST(request('final'));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/policy/);
    expect(buildMonthlyExpenseReport).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('still permits dated draft snapshots', async () => {
    const response = await POST(request('draft'));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      'create_finance_report_snapshot',
      expect.objectContaining({ make_final: false, target_month: '2026-10-01' })
    );
  });
});
