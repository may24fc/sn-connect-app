import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/tasks/_lib', async () => {
  const actual =
    await vi.importActual<typeof import('@/app/api/tasks/_lib')>('@/app/api/tasks/_lib');

  return {
    ...actual,
    getTaskAuthedContext: vi.fn(),
  };
});

vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(async () => 'Jane Doe'),
}));

import { GET, POST } from '@/app/api/tasks/[id]/comments/route';
import { getTaskAuthedContext } from '@/app/api/tasks/_lib';
import { createNotification } from '@/lib/notifications/create-notification';

interface TaskRow {
  id: string;
  title: string;
  assigned_to: string | null;
  assigned_by: string;
}

/** Admin client stub used by `canAccessTask` to look up the task. */
function createAdminClient(task: TaskRow | null) {
  const maybeSingle = vi.fn(async () => ({ data: task, error: null }));
  const is = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ is }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })) };
}

/** RLS-scoped client stub for the comment list/insert queries. */
function createUserClient(comments: Array<Record<string, unknown>>) {
  const order = vi.fn(async () => ({ data: comments, error: null }));
  const commentsEq = vi.fn(() => ({ order }));
  const employeesIs = vi.fn(async () => ({ data: [], error: null }));
  const employeesIn = vi.fn(() => ({ is: employeesIs }));

  const single = vi.fn(async () => ({
    data: { id: 'comment-1', task_id: 'task-1', user_id: 'user-1', content: 'Hello' },
    error: null,
  }));
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));

  const from = vi.fn((table: string) => {
    if (table === 'employees') {
      return { select: vi.fn(() => ({ in: employeesIn })) };
    }
    return { select: vi.fn(() => ({ eq: commentsEq })), insert };
  });

  return { client: { from }, spies: { insert } };
}

const TASK: TaskRow = {
  id: 'task-1',
  title: 'Write the report',
  assigned_to: 'assignee-1',
  assigned_by: 'assigner-1',
};

function mockContext(options: {
  userId: string;
  role: string | null;
  task: TaskRow | null;
  comments?: Array<Record<string, unknown>>;
}) {
  const admin = createAdminClient(options.task);
  const { client, spies } = createUserClient(options.comments ?? []);

  vi.mocked(getTaskAuthedContext).mockResolvedValue({
    ok: true,
    context: {
      supabase: client,
      supabaseAdmin: admin,
      user: { id: options.userId },
      role: options.role,
    },
  } as never);

  return spies;
}

describe('/api/tasks/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the caller is not authenticated', async () => {
    vi.mocked(getTaskAuthedContext).mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const response = await GET(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 404 when the task does not exist', async () => {
    mockContext({ userId: 'assignee-1', role: 'employee', task: null });

    const response = await GET(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 403 for an employee who is neither assignee nor assigner', async () => {
    mockContext({ userId: 'stranger-1', role: 'employee', task: TASK });

    const response = await GET(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'You do not have access to this task',
    });
  });

  it('lists comments for the assignee', async () => {
    mockContext({
      userId: 'assignee-1',
      role: 'employee',
      task: TASK,
      comments: [
        {
          id: 'comment-1',
          task_id: 'task-1',
          user_id: 'assignee-1',
          content: 'On it',
          created_at: '2026-09-18T00:00:00.000Z',
        },
      ],
    });

    const response = await GET(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Array<{ commenter_name: string | null }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.commenter_name).toBeNull();
  });

  it('lists comments for an oversight role that is not on the task', async () => {
    mockContext({ userId: 'hr-1', role: 'hr', task: TASK });

    const response = await GET(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(200);
  });

  it('rejects a comment body that fails validation', async () => {
    mockContext({ userId: 'assignee-1', role: 'employee', task: TASK });

    const response = await POST(
      new Request('http://localhost/api/tasks/task-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      }) as never,
      { params: Promise.resolve({ id: 'task-1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('creates a comment and notifies the other participant', async () => {
    mockContext({ userId: 'assignee-1', role: 'employee', task: TASK });

    const response = await POST(
      new Request('http://localhost/api/tasks/task-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      }) as never,
      { params: Promise.resolve({ id: 'task-1' }) }
    );

    expect(response.status).toBe(201);
    // The commenter is the assignee, so only the assigner is notified.
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'assigner-1', link: '/super-admin/tasks/task-1' })
    );
  });

  it('refuses to create a comment for a user without task access', async () => {
    const spies = mockContext({ userId: 'stranger-1', role: 'employee', task: TASK });

    const response = await POST(
      new Request('http://localhost/api/tasks/task-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      }) as never,
      { params: Promise.resolve({ id: 'task-1' }) }
    );

    expect(response.status).toBe(403);
    expect(spies.insert).not.toHaveBeenCalled();
  });
});
