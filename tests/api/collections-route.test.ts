import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/resources/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  isResourceAdmin: vi.fn(),
}));

import { GET, POST } from '@/app/api/collections/route';
import { getAuthedSupabase, isResourceAdmin } from '@/app/api/resources/_lib';

interface QueryBuilderResult {
  data: Array<Record<string, unknown>> | Record<string, unknown> | null;
  error: unknown;
  count?: number | null;
}

function createCollectionListQuery(result: QueryBuilderResult) {
  const query = {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    or: vi.fn(() => query),
    range: vi.fn(async () => ({
      data: result.data,
      error: result.error,
      count: result.count ?? 0,
    })),
  };

  return query;
}

function createCollectionInsertQuery(result: QueryBuilderResult) {
  const query = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data: result.data, error: result.error })),
  };

  return query;
}

describe('/api/collections route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: null,
      role: null,
      error: 'Unauthorized',
    });

    const request = new Request('http://localhost/api/collections');
    const response = await GET(request as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('GET returns paginated collections list', async () => {
    const listQuery = createCollectionListQuery({
      data: [{ id: 'col-1', title: 'Onboarding Pack' }],
      error: null,
      count: 1,
    });

    const supabase = {
      from: vi.fn(() => listQuery),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });

    const url = new URL('http://localhost/api/collections?search=onboard&page=2&pageSize=10');
    const request = {
      nextUrl: { searchParams: url.searchParams },
    };
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('resource_collections');
    expect(listQuery.or).toHaveBeenCalledWith('title.ilike.%onboard%,description.ilike.%onboard%');
    expect(listQuery.range).toHaveBeenCalledWith(10, 19);
    expect(json).toEqual({
      data: [{ id: 'col-1', title: 'Onboarding Pack' }],
      pagination: {
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('POST returns 403 for non-admin role', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
      role: 'employee',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(false);

    const request = new Request('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Collection A' }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('POST returns 400 for invalid payload', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(true);

    const request = new Request('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid request body');
  });

  it('POST creates collection and maps payload to snake_case fields', async () => {
    const insertQuery = createCollectionInsertQuery({
      data: { id: 'col-1', title: 'Collection A' },
      error: null,
    });
    const supabase = {
      from: vi.fn(() => insertQuery),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(true);

    const request = new Request('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Collection A',
        description: 'Collection description',
        isPublic: false,
        targetRoles: ['employee'],
        targetDepartments: [],
      }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith({
      title: 'Collection A',
      description: 'Collection description',
      thumbnail_path: null,
      is_public: false,
      target_roles: ['employee'],
      target_departments: [],
      author_id: 'user-1',
      created_by: 'user-1',
    });
    await expect(response.json()).resolves.toEqual({
      data: { id: 'col-1', title: 'Collection A' },
    });
  });
});
