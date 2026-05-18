import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { DELETE } from '@/app/api/tasks/[id]/route';
import { getTaskAuthedContext } from '@/app/api/tasks/_lib';
import { logActivity } from '@/lib/audit';

type DeleteAuthContext = {
  supabase: unknown;
  supabaseAdmin: {
    from: ReturnType<typeof vi.fn>;
  };
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
};

function createDeleteTaskAdminClient(options?: {
  existingTask?: { id: string; assigned_by: string } | null;
  deleteError?: { message?: string } | null;
}) {
  const existingTask = options?.existingTask ?? { id: 'task-1', assigned_by: 'owner-1' };
  const deleteError = options?.deleteError ?? null;
  const updateIs = vi.fn(async () => ({ error: deleteError }));
  const updateEq = vi.fn(() => ({ is: updateIs }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const maybeSingle = vi.fn(async () => ({ data: existingTask, error: null }));
  const selectIs = vi.fn(() => ({ maybeSingle }));
  const selectEq = vi.fn(() => ({ is: selectIs }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const from = vi.fn(() => ({ select, update }));

  return {
    client: { from },
    spies: { from, select, selectEq, selectIs, maybeSingle, update, updateEq, updateIs },
  };
}

describe('/api/tasks/[id] DELETE route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes a task for super-admin using the admin client', async () => {
    const { client, spies } = createDeleteTaskAdminClient({
      existingTask: { id: 'task-1', assigned_by: 'employee-1' },
    });

    vi.mocked(getTaskAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabase: {},
        supabaseAdmin: client,
        user: { id: 'super-admin-1' },
        role: 'super_admin',
      } satisfies DeleteAuthContext,
    });

    const response = await DELETE(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(spies.from).toHaveBeenCalledWith('tasks');
    expect(spies.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(logActivity).toHaveBeenCalledWith(client, {
      userId: 'super-admin-1',
      action: 'delete_task',
      tableName: 'tasks',
      recordId: 'task-1',
    });
  });

  it('rejects delete when the actor is neither the assigner nor an admin', async () => {
    const { client, spies } = createDeleteTaskAdminClient({
      existingTask: { id: 'task-1', assigned_by: 'owner-1' },
    });

    vi.mocked(getTaskAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabase: {},
        supabaseAdmin: client,
        user: { id: 'employee-2' },
        role: 'employee',
      } satisfies DeleteAuthContext,
    });

    const response = await DELETE(undefined as never, {
      params: Promise.resolve({ id: 'task-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Only task assigners or admins can delete tasks',
    });
    expect(spies.update).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});