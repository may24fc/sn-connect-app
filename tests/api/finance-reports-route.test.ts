import { DELETE, POST } from '@/app/api/finance/reports/route';
import { logActivity } from '@/lib/audit';
import { buildMonthlyExpenseReport } from '@/lib/expenses/monthly-report';
import { getFinanceContext } from '@/lib/finance/auth';
import { buildFinanceReportPackSupplement } from '@/lib/finance/report-pack';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
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

describe('Finance report snapshot deletion', () => {
  const snapshotId = '123e4567-e89b-42d3-a456-426614174000';
  let deleted: { data: Array<{ id: string; report_month: string }>; error: null };
  const eq = vi.fn();
  const query = {
    delete: vi.fn(() => query),
    eq: eq.mockImplementation(() => query),
    select: vi.fn(async () => deleted),
  };
  const from = vi.fn(() => query);
  const remove = (id: string) =>
    DELETE(
      new NextRequest(`http://localhost/api/finance/reports?snapshot=${id}`, { method: 'DELETE' })
    );

  beforeEach(() => {
    vi.clearAllMocks();
    deleted = { data: [{ id: snapshotId, report_month: '2026-10-01' }], error: null };
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'actor' },
      capabilities: { isLeadership: true },
      admin: { from },
    } as never);
  });

  it('deletes only draft snapshots', async () => {
    expect((await remove(snapshotId)).status).toBe(200);
    expect(eq).toHaveBeenCalledWith('status', 'draft');
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'finance_report_snapshot_delete', recordId: snapshotId })
    );
  });

  it('refuses final or missing snapshots and invalid IDs', async () => {
    deleted = { data: [], error: null };
    expect((await remove(snapshotId)).status).toBe(409);
    expect((await remove('bad-id')).status).toBe(400);
  });

  it('requires Finance access', async () => {
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'actor' },
      capabilities: { isLeadership: false },
      admin: { from },
    } as never);
    expect((await remove(snapshotId)).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });
});
