import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET } from '@/app/api/work-tracker/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  isProjectAdmin: vi.fn((role: string | null) => role === 'admin' || role === 'super_admin'),
}));

interface QueryResult {
  data: Array<Record<string, unknown>> | null;
  error: Record<string, unknown> | null;
}

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn((_column: string, _values: Array<string>) => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaitable.
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

describe('/api/work-tracker GET route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('returns core team work when optional rollout tables and columns are unavailable', async () => {
    let taskQueryCount = 0;
    const tableResults: Record<string, QueryResult> = {
      employee_directory: {
        data: [
          {
            user_id: 'employee-1',
            full_name: 'Alex Employee',
            department_name: 'Operations',
            role: 'employee',
            status: 'active',
          },
        ],
        error: null,
      },
      projects: { data: [], error: null },
      project_contributors: { data: [], error: null },
      project_milestones: { data: [], error: null },
      hub_usage_daily: {
        data: null,
        error: { code: '42P01', message: 'relation hub_usage_daily does not exist' },
      },
    };
    const from = vi.fn((table: string) => {
      if (table === 'tasks') {
        taskQueryCount += 1;
        if (taskQueryCount === 1) {
          return query({
            data: null,
            error: { code: '42703', message: 'column tasks.project_id does not exist' },
          });
        }
        return query({
          data: [
            {
              id: 'task-1',
              title: 'Prepare launch checklist',
              description: null,
              assigned_to: 'employee-1',
              status: 'pending',
              priority: 'high',
              due_date: null,
              created_at: '2026-09-29T00:00:00.000Z',
              updated_at: '2026-09-29T00:00:00.000Z',
            },
          ],
          error: null,
        });
      }
      const result = tableResults[table];
      if (!result) throw new Error(`Unexpected table: ${table}`);
      return query(result);
    });

    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabaseAdmin: { from },
        user: { id: 'admin-1' },
        role: 'admin',
      } as never,
    });

    const response = await GET(
      new NextRequest('http://localhost/api/work-tracker?scope=team&days=30')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.usageAvailable).toBe(false);
    expect(body.people).toHaveLength(1);
    expect(body.people[0].items).toEqual([
      expect.objectContaining({ id: 'task-1', source: 'task', projectId: null }),
    ]);
    expect(taskQueryCount).toBe(2);
  });

  it('queries only valid user_status values so production can load team and roadmap data', async () => {
    const directoryResult: QueryResult = { data: [], error: null };
    const directoryQuery = query(directoryResult);
    directoryQuery.in.mockImplementation((column: string, values: Array<string>) => {
      if (
        column === 'status' &&
        values.some((value) => !['active', 'on_leave', 'terminated'].includes(value))
      ) {
        directoryResult.error = {
          code: '22P02',
          message: 'invalid input value for enum user_status',
        };
      }
      return directoryQuery;
    });
    const from = vi.fn((table: string) =>
      table === 'employee_directory' ? directoryQuery : query({ data: [], error: null })
    );

    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: {
        supabaseAdmin: { from },
        user: { id: 'admin-1' },
        role: 'admin',
      } as never,
    });

    const response = await GET(
      new NextRequest('http://localhost/api/work-tracker?scope=team&days=30')
    );

    expect(response.status).toBe(200);
    expect((await response.json()).projects).toEqual([]);
  });
});
