import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isAccounting: boolean }) => capabilities.isAccounting,
}));

import { GET, POST } from '@/app/api/finance/catalog/route';
import { getFinanceContext } from '@/lib/finance/auth';

const request = new NextRequest('http://localhost/api/finance/catalog?month=2026-06-01');

describe('Finance subscription catalog', () => {
  let subscriptions: Array<{ id: string; vendor_name: string; seats: number }>;
  let charges: Array<{ subscription_id: string; last_charged: string }>;
  let serverPageSize: number;
  let ranges: Array<{ table: string; start: number; end: number }>;
  let deletedTables: Array<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions = [{ id: 'sub-1', vendor_name: 'Example', seats: 3 }];
    charges = [{ subscription_id: 'sub-1', last_charged: '2026-06-10' }];
    serverPageSize = 1000;
    ranges = [];
    deletedTables = [];
    const from = vi.fn((table: string) => {
      const data =
        table === 'finance_subscriptions'
          ? subscriptions
          : table === 'finance_subscription_last_charges'
            ? charges
            : [];
      const result = { data, count: data.length, error: null };
      const query = Promise.resolve(result) as Promise<typeof result> & Record<string, unknown>;
      for (const method of ['select', 'order', 'eq']) query[method] = vi.fn(() => query);
      query.delete = vi.fn(() => {
        deletedTables.push(table);
        return query;
      });
      query.range = vi.fn(async (start: number, end: number) => {
        ranges.push({ table, start, end });
        return {
          data: data.slice(start, Math.min(end + 1, start + serverPageSize)),
          count: data.length,
          error: null,
        };
      });
      return query;
    });
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isAccounting: true },
      admin: { from },
    } as never);
  });

  it('shows the latest explicitly linked charge with stored seats', async () => {
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect((await response.json()).data.subscriptions[0]).toMatchObject({
      seats: 3,
      last_charged: '2026-06-10',
    });
  });

  it('paginates even when the database returns fewer than the requested 1,000 rows', async () => {
    serverPageSize = 500;
    subscriptions = Array.from({ length: 1001 }, (_, index) => ({
      id: `sub-${index}`,
      vendor_name: `Vendor ${index}`,
      seats: 1,
    }));
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect((await response.json()).data.subscriptions).toHaveLength(1001);
    expect(
      ranges.filter((entry) => entry.table === 'finance_subscriptions').map((entry) => entry.start)
    ).toEqual([0, 500, 1000]);
  });

  it('fails closed when the complete catalog exceeds the supported limit', async () => {
    subscriptions = Array.from({ length: 10001 }, (_, index) => ({
      id: `sub-${index}`,
      vendor_name: `Vendor ${index}`,
      seats: 1,
    }));
    const response = await GET(request);
    expect(response.status).toBe(413);
    expect((await response.json()).error).toMatch(/10,000/);
  });

  it('clears an optional monthly limit and rejects zero as a configured limit', async () => {
    const clearResponse = await POST(
      new NextRequest('http://localhost/api/finance/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'budget_clear',
          categoryCode: 'software',
          month: '2026-06-01',
        }),
      })
    );
    expect(clearResponse.status).toBe(200);
    expect(deletedTables).toEqual(['finance_budgets']);

    const zeroResponse = await POST(
      new NextRequest('http://localhost/api/finance/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'budget',
          categoryCode: 'software',
          month: '2026-06-01',
          amountAud: 0,
        }),
      })
    );
    expect(zeroResponse.status).toBe(400);
  });
});
