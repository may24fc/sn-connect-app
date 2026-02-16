import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/resources/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  isResourceAdmin: vi.fn(),
}));

import {
  DELETE,
  GET,
  POST,
} from '@/app/api/collections/[id]/resources/route';
import { getAuthedSupabase, isResourceAdmin } from '@/app/api/resources/_lib';

function createCollectionResourcesQuery(data: Array<{ resources: unknown | null }>, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error })),
    insert: vi.fn(async () => ({ error })),
    delete: vi.fn(() => query),
  };

  return query;
}

describe('/api/collections/[id]/resources route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET returns filtered resources array for collection', async () => {
    const query = createCollectionResourcesQuery([
      { resources: { id: 'res-1', title: 'First' } },
      { resources: null },
      { resources: { id: 'res-2', title: 'Second' } },
    ]);
    const supabase = { from: vi.fn(() => query) };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      role: 'employee',
      error: null,
    });

    const response = await GET(new Request('http://localhost/api/collections/col-1/resources') as never, {
      params: Promise.resolve({ id: 'col-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: 'res-1', title: 'First' },
        { id: 'res-2', title: 'Second' },
      ],
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

    const request = new Request('http://localhost/api/collections/col-1/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: '1d304fa6-b95d-49c8-afd3-e72f6682ec11', displayOrder: 1 }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ id: 'col-1' }),
    });

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

    const request = new Request('http://localhost/api/collections/col-1/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: 'not-a-uuid' }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ id: 'col-1' }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid request body');
  });

  it('POST inserts membership row and returns 201', async () => {
    const query = createCollectionResourcesQuery([]);
    const supabase = { from: vi.fn(() => query) };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(true);

    const request = new Request('http://localhost/api/collections/col-1/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: '1d304fa6-b95d-49c8-afd3-e72f6682ec11',
        displayOrder: 3,
      }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ id: 'col-1' }),
    });

    expect(query.insert).toHaveBeenCalledWith({
      collection_id: 'col-1',
      resource_id: '1d304fa6-b95d-49c8-afd3-e72f6682ec11',
      display_order: 3,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('DELETE returns 400 when resourceId query param is missing', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(true);

    const url = new URL('http://localhost/api/collections/col-1/resources');
    const request = {
      nextUrl: { searchParams: url.searchParams },
    };
    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: 'col-1' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'resourceId is required' });
  });

  it('DELETE removes membership row and returns success', async () => {
    const query = createCollectionResourcesQuery([]);
    const supabase = { from: vi.fn(() => query) };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isResourceAdmin).mockReturnValue(true);

    const url = new URL('http://localhost/api/collections/col-1/resources?resourceId=res-1');
    const request = {
      nextUrl: { searchParams: url.searchParams },
    };
    const response = await DELETE(
      request as never,
      {
        params: Promise.resolve({ id: 'col-1' }),
      }
    );

    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('collection_id', 'col-1');
    expect(query.eq).toHaveBeenCalledWith('resource_id', 'res-1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});