import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { GET } from '@/app/api/dashboard/analytics/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ExpenseRow = {
  transaction_date: string;
  processing_status: string;
  expense_type: string | null;
  total_amount: number;
  total_amount_aud: number | null;
  department_id: string | null;
  employee: { department: string | null } | Array<{ department: string | null }> | null;
};

function createExpenseEntriesQuery(rows: ExpenseRow[]) {
  const eqCalls: Array<[string, string]> = [];
  const gteCalls: Array<[string, string]> = [];
  const lteCalls: Array<[string, string]> = [];
  const result = { data: rows, error: null };

  const query = {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn((column: string, value: string) => {
      gteCalls.push([column, value]);
      return query;
    }),
    lte: vi.fn((column: string, value: string) => {
      lteCalls.push([column, value]);
      return query;
    }),
    order: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push([column, value]);
      return query;
    }),
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return { query, eqCalls, gteCalls, lteCalls };
}

function createUsersRoleQuery(role: string | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: role ? { role } : null, error: null })),
  };
}

describe('/api/dashboard/analytics GET route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: { message: 'Unauthorized' } })),
      },
      from: vi.fn(),
    } as never);

    const response = await GET(new NextRequest('http://localhost/api/dashboard/analytics'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin roles', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'user-1', app_metadata: { db_role: 'employee' } },
          },
          error: null,
        })),
      },
      from: vi.fn(),
    } as never);

    const response = await GET(new NextRequest('http://localhost/api/dashboard/analytics'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns month analytics aggregates with AUD normalization fallback', async () => {
    const { query: expenseQuery } = createExpenseEntriesQuery([
      {
        transaction_date: '2026-05-03',
        processing_status: 'approved',
        expense_type: 'software',
        total_amount: 100,
        total_amount_aud: 150,
        department_id: 'dep-1',
        employee: { department: 'Accounting' },
      },
      {
        transaction_date: '2026-05-18',
        processing_status: 'approved',
        expense_type: 'software',
        total_amount: 200,
        total_amount_aud: null,
        department_id: 'dep-1',
        employee: [{ department: 'Accounting' }],
      },
      {
        transaction_date: '2026-06-01',
        processing_status: 'rejected',
        expense_type: null,
        total_amount: 80,
        total_amount_aud: 100,
        department_id: null,
        employee: null,
      },
    ]);

    const from = vi.fn((table: string) => {
      if (table === 'expense_entries') {
        return expenseQuery;
      }

      if (table === 'users') {
        return createUsersRoleQuery('admin');
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'admin-1', app_metadata: { db_role: 'admin' } },
          },
          error: null,
        })),
      },
      from,
    } as never);

    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard/analytics?period=month&startDate=2026-05-01&endDate=2026-06-30'
      )
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.period).toBe('month');
    expect(json.data.totalEntries).toBe(3);
    expect(json.data.totalSpendAud).toBe(450);
    expect(json.data.averageSpendAudPerEntry).toBe(150);

    expect(json.data.trend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ periodStart: '2026-05-01', totalSpendAud: 350, entryCount: 2 }),
        expect.objectContaining({ periodStart: '2026-06-01', totalSpendAud: 100, entryCount: 1 }),
      ])
    );

    expect(json.data.statusBreakdown[0]).toEqual(
      expect.objectContaining({ status: 'approved', count: 2, totalSpendAud: 350 })
    );

    expect(json.data.categoryBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'software', count: 2, totalSpendAud: 350 }),
        expect.objectContaining({ category: 'other', count: 1, totalSpendAud: 100 }),
      ])
    );

    expect(json.data.departmentBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ departmentId: 'dep-1', departmentName: 'Accounting', count: 2, totalSpendAud: 350 }),
        expect.objectContaining({ departmentId: 'unassigned', departmentName: 'Unassigned', count: 1, totalSpendAud: 100 }),
      ])
    );
  });

  it('forwards date and optional filters to expense query builder', async () => {
    const { query: expenseQuery, eqCalls, gteCalls, lteCalls } = createExpenseEntriesQuery([]);

    const from = vi.fn((table: string) => {
      if (table === 'expense_entries') {
        return expenseQuery;
      }

      if (table === 'users') {
        return createUsersRoleQuery('admin');
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'admin-1', app_metadata: { db_role: 'admin' } },
          },
          error: null,
        })),
      },
      from,
    } as never);

    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard/analytics?period=week&departmentId=dep-9&processingStatus=approved&startDate=2026-06-01&endDate=2026-06-30'
      )
    );

    expect(response.status).toBe(200);
    expect(gteCalls).toContainEqual(['transaction_date', '2026-06-01']);
    expect(lteCalls).toContainEqual(['transaction_date', '2026-06-30']);
    expect(eqCalls).toContainEqual(['department_id', 'dep-9']);
    expect(eqCalls).toContainEqual(['processing_status', 'approved']);
  });
});
