import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/tasks/_lib', () => ({
  TASK_ASSIGNER_ROLE: 'super_admin',
  getTaskAuthedContext: vi.fn(),
  getTaskWriteErrorMessage: vi.fn(
    (error: { message?: string } | null) => error?.message || 'Task operation failed'
  ),
  validateTaskAssignee: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(),
}));

import { GET } from '@/app/api/tasks/route';
import { getTaskAuthedContext } from '@/app/api/tasks/_lib';

type TaskListAuthContext = {
  supabaseAdmin: {
    from: ReturnType<typeof vi.fn>;
  };
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
};

function createTaskListAdminClient() {
  const eqCalls: Array<[string, string]> = [];
  const result = { data: [], error: null, count: 0 };

  const query = {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push([column, value]);
      return query;
    }),
    or: vi.fn(() => query),
    overlaps: vi.fn(() => query),
    range: vi.fn(() => query),
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  const from = vi.fn((table: string) => {
    if (table !== 'tasks') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return query;
  });

  return { client: { from }, eqCalls };
}

describe('/api/tasks GET route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes super-admin task management to tasks assigned by the current super-admin', async () => {
    const { client, eqCalls } = createTaskListAdminClient();

    vi.mocked(getTaskAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabaseAdmin: client,
        user: { id: 'super-admin-1' },
        role: 'super_admin',
      } satisfies TaskListAuthContext,
    });

    const response = await GET(new NextRequest('http://localhost/api/tasks?page=1&pageSize=100'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
      },
    });
    expect(eqCalls).toContainEqual(['assigned_by', 'super-admin-1']);
    expect(eqCalls).not.toContainEqual(['assigned_to', 'super-admin-1']);
  });

  it('scopes non-super-admin users to tasks assigned to themselves', async () => {
    const { client, eqCalls } = createTaskListAdminClient();

    vi.mocked(getTaskAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabaseAdmin: client,
        user: { id: 'employee-1' },
        role: 'employee',
      } satisfies TaskListAuthContext,
    });

    const response = await GET(new NextRequest('http://localhost/api/tasks?page=1&pageSize=100'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
      },
    });
    expect(eqCalls).toContainEqual(['assigned_to', 'employee-1']);
    expect(eqCalls).not.toContainEqual(['assigned_by', 'employee-1']);
  });
});