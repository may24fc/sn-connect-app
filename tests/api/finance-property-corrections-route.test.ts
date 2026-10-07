import { PATCH } from '@/app/api/finance/properties/corrections/route';
import { logActivity } from '@/lib/audit';
import { getFinanceContext } from '@/lib/finance/auth';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isLeadership: boolean; isAccounting: boolean }) =>
    capabilities.isLeadership || capabilities.isAccounting,
}));

const id = '123e4567-e89b-42d3-a456-426614174000';
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/finance/properties/corrections', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('Property correction API', () => {
  const rpc = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'reviewer' },
      capabilities: { isLeadership: false, isAccounting: true },
      admin: { rpc },
    } as never);
  });
  it('denies unprivileged users before calling the admin RPC', async () => {
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isLeadership: false, isAccounting: false },
      admin: { rpc },
    } as never);
    expect((await PATCH(request({ kind: 'rent_void', id, reason: 'Entered twice' }))).status).toBe(
      403
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it('requires a correction reason and a real change of status', async () => {
    expect((await PATCH(request({ kind: 'rent_void', id, reason: 'short' }))).status).toBe(400);
    expect(
      (
        await PATCH(
          request({ kind: 'maintenance_status', id, expectedStatus: 'paid', status: 'paid' })
        )
      ).status
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('voids rent without deleting the row or exposing the reason in audit metadata', async () => {
    const response = await PATCH(request({ kind: 'rent_void', id, reason: 'Duplicate entry' }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('void_finance_rent_payment', {
      payment_id: id,
      actor_id: 'reviewer',
      correction_reason: 'Duplicate entry',
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'finance_rent_void',
        recordId: id,
      })
    );
    expect(JSON.stringify(vi.mocked(logActivity).mock.calls)).not.toContain('Duplicate entry');
  });
  it('records maintenance progression and reports stale status without falsely claiming success', async () => {
    expect(
      (
        await PATCH(
          request({ kind: 'maintenance_status', id, expectedStatus: 'scheduled', status: 'paid' })
        )
      ).status
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith('update_finance_maintenance_status', {
      job_id: id,
      actor_id: 'reviewer',
      expected_status: 'scheduled',
      next_status: 'paid',
    });
    rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (
        await PATCH(
          request({ kind: 'maintenance_status', id, expectedStatus: 'scheduled', status: 'paid' })
        )
      ).status
    ).toBe(409);
    expect(logActivity).toHaveBeenCalledTimes(1);
  });
});
