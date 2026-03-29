import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { GET } from '@/app/api/audit-logs/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type QueryResult<T> = {
  data: T;
  error: unknown;
};

function createThenableQuery<T>(result: QueryResult<T>) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    then: (
      onFulfilled?: (value: QueryResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

describe('/api/audit-logs route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns admin-scoped activity and preserves OKR casing in labels', async () => {
    const actorIdsQuery = createThenableQuery({
      data: [{ id: 'admin-actor' }],
      error: null,
    });
    const auditLogsQuery = createThenableQuery({
      data: [
        {
          id: 'log-1',
          table_name: 'okr_targets',
          record_id: 'okr-1',
          operation: 'INSERT',
          action: null,
          metadata: { title: 'Improve onboarding speed' },
          old_values: null,
          new_values: { title: 'Improve onboarding speed' },
          performed_by: 'admin-actor',
          performed_at: '2026-03-29T10:00:00Z',
        },
      ],
      error: null,
    });
    const userProfilesQuery = createThenableQuery({
      data: [
        {
          id: 'admin-actor',
          first_name: 'Alex',
          last_name: 'Admin',
          email: 'alex@example.com',
        },
      ],
      error: null,
    });

    let usersCallCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'viewer-admin',
              app_metadata: { db_role: 'admin' },
            },
          },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') return auditLogsQuery;
        if (table === 'users') {
          usersCallCount += 1;
          return usersCallCount === 1 ? actorIdsQuery : userProfilesQuery;
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(new Request('http://localhost/api/audit-logs?scope=admin&limit=5'));

    expect(response.status).toBe(200);
    expect(auditLogsQuery.in).toHaveBeenCalledWith('performed_by', ['admin-actor']);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'log-1',
          action: 'Created an OKR target: for Improve onboarding speed',
          performedBy: 'Alex Admin',
          timestamp: '2026-03-29T10:00:00Z',
          tableName: 'okr_targets',
          categoryLabel: 'Performance',
          category: 'performance',
        },
      ],
    });
  });

  it('rejects admin attempts to request the super-admin scope', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'viewer-admin',
              app_metadata: { db_role: 'admin' },
            },
          },
          error: null,
        })),
      },
      from: vi.fn(),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(new Request('http://localhost/api/audit-logs?scope=super_admin'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('includes automated system entries in the super-admin scope', async () => {
    const actorIdsQuery = createThenableQuery({
      data: [{ id: 'super-actor' }],
      error: null,
    });
    const auditLogsQuery = createThenableQuery({
      data: [
        {
          id: 'log-1',
          table_name: 'notifications',
          record_id: 'notif-1',
          operation: 'INSERT',
          action: null,
          metadata: { title: 'Payroll sync completed' },
          old_values: null,
          new_values: { title: 'Payroll sync completed' },
          performed_by: null,
          performed_at: '2026-03-29T09:00:00Z',
        },
        {
          id: 'log-2',
          table_name: 'okrs',
          record_id: 'okr-2',
          operation: 'INSERT',
          action: null,
          metadata: { title: 'Improve retention' },
          old_values: null,
          new_values: { title: 'Improve retention' },
          performed_by: 'super-actor',
          performed_at: '2026-03-29T08:30:00Z',
        },
      ],
      error: null,
    });
    const userProfilesQuery = createThenableQuery({
      data: [
        {
          id: 'super-actor',
          first_name: 'Sam',
          last_name: 'Super',
          email: 'sam@example.com',
        },
      ],
      error: null,
    });

    let usersCallCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'viewer-super',
              app_metadata: { db_role: 'super_admin' },
            },
          },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') return auditLogsQuery;
        if (table === 'users') {
          usersCallCount += 1;
          return usersCallCount === 1 ? actorIdsQuery : userProfilesQuery;
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(new Request('http://localhost/api/audit-logs?scope=super_admin'));

    expect(response.status).toBe(200);
    expect(auditLogsQuery.or).toHaveBeenCalledWith(
      'performed_by.in.(super-actor),performed_by.is.null'
    );

    const json = await response.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0]?.performedBy).toBe('System');
    expect(json.data[1]?.performedBy).toBe('Sam Super');
  });

  it('renders onboarding approvals with a human-readable user name instead of a raw id', async () => {
    const actorIdsQuery = createThenableQuery({
      data: [{ id: 'admin-actor' }],
      error: null,
    });
    const auditLogsQuery = createThenableQuery({
      data: [
        {
          id: 'log-approval',
          table_name: 'users',
          record_id: 'target-user',
          operation: 'UPDATE',
          action: 'approve_onabording',
          metadata: null,
          old_values: null,
          new_values: null,
          performed_by: 'admin-actor',
          performed_at: '2026-03-29T11:00:00Z',
        },
      ],
      error: null,
    });
    const userProfilesQuery = createThenableQuery({
      data: [
        {
          id: 'admin-actor',
          first_name: 'Alex',
          last_name: 'Admin',
          email: 'alex@example.com',
        },
        {
          id: 'target-user',
          first_name: 'Taylor',
          last_name: 'Employee',
          email: 'taylor@example.com',
        },
      ],
      error: null,
    });

    let usersCallCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'viewer-admin',
              app_metadata: { db_role: 'admin' },
            },
          },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') return auditLogsQuery;
        if (table === 'users') {
          usersCallCount += 1;
          return usersCallCount === 1 ? actorIdsQuery : userProfilesQuery;
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(new Request('http://localhost/api/audit-logs?scope=admin'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'log-approval',
          action: 'Approved onboarding: for Taylor Employee',
          performedBy: 'Alex Admin',
          timestamp: '2026-03-29T11:00:00Z',
          tableName: 'users',
          categoryLabel: 'Users',
          category: 'employees',
        },
      ],
    });
  });

  it('renders AI suggestion click analytics with the clicked suggestion label', async () => {
    const actorIdsQuery = createThenableQuery({
      data: [{ id: 'admin-actor' }],
      error: null,
    });
    const auditLogsQuery = createThenableQuery({
      data: [
        {
          id: 'log-suggestion',
          table_name: 'ai_chat',
          record_id: 'admin-actor',
          operation: 'INSERT',
          action: 'ai_chat_suggestion_click',
          metadata: { title: 'Leave policy overview' },
          old_values: null,
          new_values: null,
          performed_by: 'admin-actor',
          performed_at: '2026-03-29T12:00:00Z',
        },
      ],
      error: null,
    });
    const userProfilesQuery = createThenableQuery({
      data: [
        {
          id: 'admin-actor',
          first_name: 'Avery',
          last_name: 'Admin',
          email: 'avery@example.com',
        },
      ],
      error: null,
    });

    let usersCallCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'viewer-admin',
              app_metadata: { db_role: 'admin' },
            },
          },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') return auditLogsQuery;
        if (table === 'users') {
          usersCallCount += 1;
          return usersCallCount === 1 ? actorIdsQuery : userProfilesQuery;
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(new Request('http://localhost/api/audit-logs?scope=admin&limit=5'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'log-suggestion',
          action: 'Clicked an AI chat suggestion: for Leave policy overview',
          performedBy: 'Avery Admin',
          timestamp: '2026-03-29T12:00:00Z',
          tableName: 'ai_chat',
          categoryLabel: 'AI Chat',
          category: 'ai',
        },
      ],
    });
  });
});