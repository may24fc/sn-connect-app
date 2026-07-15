import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { GET } from '../../apps/web/src/app/api/directory/route';
import { createSupabaseServerClient } from '../../apps/web/src/lib/supabase/server';

type QueryResult<T> = {
  data: T;
  error: unknown;
  count?: number | null;
};

function createThenableQuery<T>(result: QueryResult<T>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    then: (
      onFulfilled?: (value: QueryResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

describe('/api/directory route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary metadata and role filters without department metadata', async () => {
    const pageQuery = createThenableQuery({
      data: [
        {
          user_id: 'user-1',
          employee_id: 'employee-1',
          full_name: 'Camille Buquir',
          role: 'admin',
          department_name: null,
          status: 'active',
          employment_type: 'regular',
        },
      ],
      error: null,
      count: 1,
    });

    const aggregateQuery = createThenableQuery({
      data: [
        {
          role: 'admin',
          status: 'active',
          internship_status: null,
          employment_type: 'regular',
          department_name: null,
        },
        {
          role: 'associate',
          status: 'on_leave',
          internship_status: 'active',
          employment_type: 'probationary',
          department_name: 'Operations',
        },
      ],
      error: null,
    });

    let directoryCallCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table !== 'employee_directory') {
          throw new Error(`Unexpected table: ${table}`);
        }
        directoryCallCount += 1;
        return directoryCallCount === 1 ? pageQuery : aggregateQuery;
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);

    const response = await GET(
      new NextRequest('http://localhost/api/directory?page=1&page_size=20')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          user_id: 'user-1',
          employee_id: 'employee-1',
          full_name: 'Camille Buquir',
          role: 'admin',
          department_name: null,
          status: 'active',
          employment_type: 'regular',
        },
      ],
      metadata: {
        total: 1,
        active: 1,
        interns: 1,
        onLeave: 1,
        probation: 1,
        availableRoles: ['admin', 'associate'],
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });
});
