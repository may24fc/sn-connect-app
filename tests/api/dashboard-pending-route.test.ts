import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/notifications/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  isNotificationAdmin: vi.fn(),
}));

vi.mock('../../apps/web/src/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { GET } from '../../apps/web/src/app/api/dashboard/pending/route';
import { getAuthedSupabase, isNotificationAdmin } from '../../apps/web/src/app/api/notifications/_lib';
import { createSupabaseAdminClient } from '../../apps/web/src/lib/supabase/server';

function createThenableQuery<T>(result: { data: T; error: unknown; count?: number | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      onFulfilled?: (value: { data: T; error: unknown; count?: number | null }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

describe('/api/dashboard/pending route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes submitted marketing reports in pending approvals for super-admin', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: { auth: { getUser: vi.fn() } },
      user: { id: 'super-admin-user' },
      role: 'super_admin',
      error: null,
    } as never);
    vi.mocked(isNotificationAdmin).mockReturnValue(true);

    const reportsQuery = createThenableQuery({
      data: [
        {
          id: 'report-1',
          employee_id: 'employee-1',
          report_type: 'marketing_weekly',
          period_start: '2026-04-01',
          period_end: '2026-04-03',
          submitted_at: '2026-04-10T09:00:00.000Z',
          created_at: '2026-04-10T08:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    });

    const invoicesQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    const reviewsQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    const internshipsQuery = createThenableQuery({
      data: [],
      error: null,
    });

    const adminClient = {
      from: vi.fn((table: string) => {
        switch (table) {
          case 'reports':
            return reportsQuery;
          case 'invoices':
            return invoicesQuery;
          case 'performance_reviews':
            return reviewsQuery;
          case 'internships':
            return internshipsQuery;
          default:
            throw new Error(`Unexpected table: ${table}`);
        }
      }),
    };

    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminClient as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingReports: {
          count: 1,
          overdue: 1,
          latest: [
            {
              id: 'report-1',
              employee_id: 'employee-1',
              report_type: 'marketing_weekly',
              period_start: '2026-04-01',
              period_end: '2026-04-03',
              submitted_at: '2026-04-10T09:00:00.000Z',
              created_at: '2026-04-10T08:00:00.000Z',
            },
          ],
        },
        pendingInvoices: {
          count: 0,
          latest: [],
        },
        pendingReviews: {
          count: 0,
          latest: [],
        },
        lateEodReports: {
          count: 0,
        },
        totalPending: 1,
      },
    });
  });
});