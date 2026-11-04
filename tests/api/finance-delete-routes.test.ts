import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/finance/subscription-fx', () => ({ convertSubscriptionToAud: vi.fn() }));
vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isAccounting: boolean }) => capabilities.isAccounting,
}));

import { DELETE as deleteSubscription } from '@/app/api/finance/catalog/[id]/route';
import { DELETE as deleteExpense } from '@/app/api/finance/expenses/[id]/route';
import { logActivity } from '@/lib/audit';
import { getFinanceContext } from '@/lib/finance/auth';

const id = '123e4567-e89b-42d3-a456-426614174000';
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = () => new NextRequest('http://localhost/api', { method: 'DELETE' });

type Result = { data: unknown; error: { message: string } | null };

function client(results: { load?: Result; write: Result }) {
  const calls: Array<{ method: string; args: Array<unknown> }> = [];
  const from = vi.fn(() => {
    let writing = false;
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'is'])
      query[method] = vi.fn((...args: Array<unknown>) => {
        calls.push({ method, args });
        return query;
      });
    for (const method of ['delete', 'update'])
      query[method] = vi.fn((...args: Array<unknown>) => {
        writing = true;
        calls.push({ method, args });
        return query;
      });
    query.maybeSingle = vi.fn(async () => (writing ? results.write : results.load));
    return query;
  });
  return { from, calls };
}

function allow(admin: { from: unknown }, isAccounting = true) {
  vi.mocked(getFinanceContext).mockResolvedValue({
    ok: true,
    user: { id: 'actor' },
    capabilities: { isAccounting },
    admin,
  } as never);
}

describe('DELETE /api/finance/catalog/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a subscription and records the audit entry', async () => {
    const db = client({ write: { data: { id, vendor_name: 'Notion' }, error: null } });
    allow(db);
    const response = await deleteSubscription(request(), params());
    expect(response.status).toBe(200);
    expect(db.from).toHaveBeenCalledWith('finance_subscriptions');
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'finance_subscription_delete', recordId: id })
    );
  });

  it('rejects invalid IDs, missing rows, and non-Finance users', async () => {
    const db = client({ write: { data: null, error: null } });
    allow(db);
    expect((await deleteSubscription(request(), params('nope'))).status).toBe(400);
    expect((await deleteSubscription(request(), params())).status).toBe(404);
    allow(db, false);
    db.from.mockClear();
    expect((await deleteSubscription(request(), params())).status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/finance/expenses/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes an unmatched expense', async () => {
    const db = client({
      load: { data: { id, vendor_name: 'Uber', match_status: 'unmatched' }, error: null },
      write: { data: { id }, error: null },
    });
    allow(db);
    const response = await deleteExpense(request(), params());
    expect(response.status).toBe(200);
    expect(db.calls).toContainEqual({
      method: 'update',
      args: [expect.objectContaining({ deleted_at: expect.any(String) })],
    });
    expect(db.calls).toContainEqual({ method: 'eq', args: ['match_status', 'unmatched'] });
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'finance_expense_delete', recordId: id })
    );
  });

  it('refuses matched expenses without writing', async () => {
    const db = client({
      load: { data: { id, vendor_name: 'Uber', match_status: 'matched' }, error: null },
      write: { data: { id }, error: null },
    });
    allow(db);
    expect((await deleteExpense(request(), params())).status).toBe(409);
    expect(db.calls.some((call) => call.method === 'update')).toBe(false);
  });

  it('returns 404 for missing expenses and 403 for non-Finance users', async () => {
    const db = client({ load: { data: null, error: null }, write: { data: null, error: null } });
    allow(db);
    expect((await deleteExpense(request(), params())).status).toBe(404);
    allow(db, false);
    expect((await deleteExpense(request(), params())).status).toBe(403);
  });
});
