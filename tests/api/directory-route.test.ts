import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/auth/active-role', () => ({
  getActiveUserRole: vi.fn(async () => 'admin'),
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
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    lte: vi.fn(() => query),
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
        {
          role: 'associate',
          status: 'active',
          internship_status: 'active',
          employment_type: 'regular',
          department_name: 'Operations',
        },
        // Terminated people must only affect the "Former" card.
        {
          role: 'associate',
          status: 'terminated',
          internship_status: 'terminated',
          employment_type: 'probationary',
          department_name: 'Operations',
        },
        {
          role: 'employee',
          status: 'terminated',
          internship_status: null,
          employment_type: 'probationary',
          department_name: null,
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
        total: 3,
        active: 2,
        interns: 2,
        onLeave: 1,
        probation: 1,
        terminated: 2,
        availableRoles: ['associate', 'employee'],
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('attaches the termination comment to terminated rows only', async () => {
    const pageQuery = createThenableQuery({
      data: [
        { user_id: 'user-1', employee_id: 'employee-1', full_name: 'Active Person', status: 'active' },
        { user_id: 'user-2', employee_id: 'employee-2', full_name: 'Gone Person', status: 'terminated' },
        { user_id: 'user-3', employee_id: 'employee-3', full_name: 'No Comment', status: 'terminated' },
      ],
      error: null,
      count: 3,
    });
    const aggregateQuery = createThenableQuery({ data: [], error: null });
    const employeesQuery = createThenableQuery({
      data: [
        { id: 'employee-2', termination_reason: 'AWOL' },
        { id: 'employee-3', termination_reason: null },
      ],
      error: null,
    });

    let directoryCallCount = 0;
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'employees') return employeesQuery;
        directoryCallCount += 1;
        return directoryCallCount === 1 ? pageQuery : aggregateQuery;
      }),
    } as never);

    const response = await GET(
      new NextRequest('http://localhost/api/directory?status=terminated&page=1&page_size=20')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // Only the terminated employees are looked up; the active row is untouched.
    expect(employeesQuery.in).toHaveBeenCalledWith('id', ['employee-2', 'employee-3']);
    expect(body.data[0]).not.toHaveProperty('termination_reason');
    expect(body.data[1].termination_reason).toBe('AWOL');
    expect(body.data[2].termination_reason).toBeNull();
  });

  it('does not query employees when the page has no terminated rows', async () => {
    const pageQuery = createThenableQuery({
      data: [{ user_id: 'user-1', employee_id: 'employee-1', full_name: 'Active Person', status: 'active' }],
      error: null,
      count: 1,
    });
    const aggregateQuery = createThenableQuery({ data: [], error: null });
    const fromMock = vi.fn((table: string) => {
      if (table === 'employees') throw new Error('employees must not be queried');
      return fromMock.mock.calls.filter(([name]) => name === 'employee_directory').length === 1
        ? pageQuery
        : aggregateQuery;
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: fromMock,
    } as never);

    const response = await GET(new NextRequest('http://localhost/api/directory?page=1'));

    expect(response.status).toBe(200);
  });

  it('restricts results to valid user_ids so pickers can resolve a saved person', async () => {
    const managerId = '6f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';
    const pageQuery = createThenableQuery({
      data: [{ user_id: managerId, full_name: 'Ana Reyes', email: 'ana@example.com' }],
      error: null,
      count: 1,
    });
    const aggregateQuery = createThenableQuery({ data: [], error: null });

    let directoryCallCount = 0;
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn(() => {
        directoryCallCount += 1;
        return directoryCallCount === 1 ? pageQuery : aggregateQuery;
      }),
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/directory?page=1&page_size=1&user_ids=${managerId},not-a-uuid`
      )
    );

    expect(response.status).toBe(200);
    // Malformed ids are dropped before they reach the query.
    expect(pageQuery.in).toHaveBeenCalledWith('user_id', [managerId]);
  });

  it('supports a historical roster with former employees through the selected cycle end', async () => {
    const pageQuery = createThenableQuery({
      data: [
        {
          user_id: 'former-user',
          employee_id: 'former-employee',
          full_name: 'Former Employee',
          status: 'terminated',
        },
      ],
      error: null,
      count: 1,
    });
    const aggregateQuery = createThenableQuery({ data: [], error: null });
    const employeesQuery = createThenableQuery({
      data: [{ id: 'former-employee', termination_reason: null }],
      error: null,
    });
    let directoryCallCount = 0;

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'employees') return employeesQuery;
        directoryCallCount += 1;
        return directoryCallCount === 1 ? pageQuery : aggregateQuery;
      }),
    } as never);

    const response = await GET(
      new NextRequest(
        'http://localhost/api/directory?include_terminated=true&created_through=2026-06-30'
      )
    );

    expect(response.status).toBe(200);
    expect(pageQuery.lte).toHaveBeenCalledWith(
      'user_created_at',
      '2026-06-30T23:59:59.999Z'
    );
    expect(pageQuery.neq).not.toHaveBeenCalledWith('status', 'terminated');
  });

  it('rejects an invalid historical roster date', async () => {
    const pageQuery = createThenableQuery({ data: [], error: null, count: 0 });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn(() => pageQuery),
    } as never);

    const response = await GET(
      new NextRequest('http://localhost/api/directory?created_through=2026-02-31')
    );

    expect(response.status).toBe(400);
    expect(pageQuery.lte).not.toHaveBeenCalled();
  });

  it('applies cycle workforce eligibility before paginating the directory', async () => {
    const eligibleUserId = '10000000-0000-4000-8000-000000000010';
    const cycleId = '10000000-0000-4000-8000-000000000002';
    const pageQuery = createThenableQuery({ data: [], error: null, count: 0 });
    const aggregateQuery = createThenableQuery({ data: [], error: null });
    let directoryCallCount = 0;
    const rpc = vi.fn(async () => ({
      data: [{ user_id: eligibleUserId }],
      error: null,
    }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      rpc,
      from: vi.fn(() => {
        directoryCallCount += 1;
        return directoryCallCount === 1 ? pageQuery : aggregateQuery;
      }),
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/directory?include_terminated=true&performance_cycle_id=${cycleId}`
      )
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('quarter_workforce_eligible_user_ids', {
      target_cycle_id: cycleId,
    });
    expect(pageQuery.in).toHaveBeenCalledWith('user_id', [eligibleUserId]);
    expect(pageQuery.range).toHaveBeenCalledWith(0, 19);
  });

  it('rejects an invalid performance cycle id', async () => {
    const pageQuery = createThenableQuery({ data: [], error: null, count: 0 });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'viewer-admin', app_metadata: { db_role: 'admin' } } },
          error: null,
        })),
      },
      from: vi.fn(() => pageQuery),
    } as never);

    const response = await GET(
      new NextRequest('http://localhost/api/directory?performance_cycle_id=not-a-uuid')
    );

    expect(response.status).toBe(400);
    expect(pageQuery.in).not.toHaveBeenCalled();
  });
});
