import { POST } from '@/app/api/projects/milestones/[id]/submit/route';
import { getProjectAuthedContext, userCanAccessProject } from '@/app/api/projects/_lib';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  userCanAccessProject: vi.fn(async () => true),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

const milestoneId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';

function setup(checklist: Array<'todo' | 'done'>, progressPct: number) {
  const updated = vi.fn(async () => ({
    data: { id: milestoneId, status: 'completed' },
    error: null,
  }));
  const from = vi.fn((table: string) => {
    if (table === 'project_milestones')
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: async () => ({
                data: {
                  id: milestoneId,
                  project_id: projectId,
                  status: 'in_progress',
                  progress_pct: progressPct,
                },
                error: null,
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({ neq: () => ({ select: () => ({ maybeSingle: updated }) }) }),
        }),
      };
    if (table === 'project_checklist_items')
      return {
        select: () => ({
          eq: async () => ({ data: checklist.map((status) => ({ status })), error: null }),
        }),
      };
    throw new Error(`Unexpected table: ${table}`);
  });
  vi.mocked(getProjectAuthedContext).mockResolvedValue({
    ok: true,
    context: {
      supabaseAdmin: { from },
      supabase: {},
      user: { id: 'user-1' },
      role: 'associate',
    },
  } as never);
  return { updated };
}

const call = () =>
  POST(
    new NextRequest(`http://localhost/api/projects/milestones/${milestoneId}/submit`, {
      method: 'POST',
    }),
    {
      params: Promise.resolve({ id: milestoneId }),
    }
  );

describe('milestone completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userCanAccessProject).mockResolvedValue(true);
  });

  it('accepts a fully completed checklist even when task progress is below 100%', async () => {
    const { updated } = setup(['done', 'done'], 0);
    expect((await call()).status).toBe(200);
    expect(updated).toHaveBeenCalledOnce();
  });

  it('rejects an incomplete checklist even when task progress is 100%', async () => {
    const { updated } = setup(['done', 'todo'], 100);
    expect((await call()).status).toBe(400);
    expect(updated).not.toHaveBeenCalled();
  });

  it('keeps task-only milestones completable', async () => {
    setup([], 100);
    expect((await call()).status).toBe(200);
  });
});
