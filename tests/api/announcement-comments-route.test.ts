import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/announcements/_lib', async () => {
  const actual = await vi.importActual<typeof import('@/app/api/announcements/_lib')>(
    '@/app/api/announcements/_lib'
  );

  return {
    ...actual,
    getAuthedSupabase: vi.fn(),
  };
});

import { GET, POST } from '@/app/api/announcements/[id]/comments/route';
import { getAuthedSupabase } from '@/app/api/announcements/_lib';

interface AnnouncementRow {
  id: string;
  status: string;
  allow_comments: boolean;
}

function createClient(
  announcement: AnnouncementRow | null,
  comments: Array<Record<string, unknown>> = []
) {
  const maybeSingle = vi.fn(async () => ({ data: announcement, error: null }));
  const announcementIs = vi.fn(() => ({ maybeSingle }));
  const announcementEq = vi.fn(() => ({ is: announcementIs }));

  const order = vi.fn(async () => ({ data: comments, error: null }));
  const commentsIs = vi.fn(() => ({ order }));
  const commentsEq = vi.fn(() => ({ is: commentsIs }));

  const single = vi.fn(async () => ({
    data: { id: 'comment-1', announcement_id: 'a-1', user_id: 'user-1', content: 'Hi' },
    error: null,
  }));
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));

  const employeesIs = vi.fn(async () => ({ data: [], error: null }));
  const employeesIn = vi.fn(() => ({ is: employeesIs }));

  const from = vi.fn((table: string) => {
    if (table === 'announcements') {
      return { select: vi.fn(() => ({ eq: announcementEq })) };
    }
    if (table === 'employees') {
      return { select: vi.fn(() => ({ in: employeesIn })) };
    }
    return { select: vi.fn(() => ({ eq: commentsEq })), insert };
  });

  return { client: { from }, spies: { insert } };
}

function mockAuth(options: {
  announcement: AnnouncementRow | null;
  role?: string | null;
  comments?: Array<Record<string, unknown>>;
}) {
  const { client, spies } = createClient(options.announcement, options.comments);

  vi.mocked(getAuthedSupabase).mockResolvedValue({
    supabase: client,
    user: { id: 'user-1' },
    role: options.role ?? 'employee',
    error: null,
  } as never);

  return spies;
}

function postRequest(content: string) {
  return new Request('http://localhost/api/announcements/a-1/comments', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }) as never;
}

const PARAMS = { params: Promise.resolve({ id: 'a-1' }) };

describe('/api/announcements/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: null,
      role: null,
      error: 'Unauthorized',
    } as never);

    const response = await GET(undefined as never, PARAMS);
    expect(response.status).toBe(401);
  });

  it('returns 404 when the announcement is not visible to the caller', async () => {
    mockAuth({ announcement: null });

    const response = await GET(undefined as never, PARAMS);
    expect(response.status).toBe(404);
  });

  it('reports whether comments are enabled alongside the list', async () => {
    mockAuth({
      announcement: { id: 'a-1', status: 'published', allow_comments: false },
      comments: [],
    });

    const response = await GET(undefined as never, PARAMS);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [],
      meta: { allowComments: false },
    });
  });

  it('rejects a comment when allow_comments is off', async () => {
    const spies = mockAuth({
      announcement: { id: 'a-1', status: 'published', allow_comments: false },
    });

    const response = await POST(postRequest('Hello'), PARAMS);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Comments are disabled for this announcement',
    });
    expect(spies.insert).not.toHaveBeenCalled();
  });

  it('rejects a comment on an unpublished announcement from a non-admin', async () => {
    const spies = mockAuth({
      announcement: { id: 'a-1', status: 'draft', allow_comments: true },
      role: 'employee',
    });

    const response = await POST(postRequest('Hello'), PARAMS);

    expect(response.status).toBe(403);
    expect(spies.insert).not.toHaveBeenCalled();
  });

  it('allows an admin to comment on an unpublished announcement', async () => {
    mockAuth({
      announcement: { id: 'a-1', status: 'draft', allow_comments: true },
      role: 'admin',
    });

    const response = await POST(postRequest('Hello'), PARAMS);
    expect(response.status).toBe(201);
  });

  it('creates a comment on a published announcement with comments enabled', async () => {
    const spies = mockAuth({
      announcement: { id: 'a-1', status: 'published', allow_comments: true },
    });

    const response = await POST(postRequest('Hello'), PARAMS);

    expect(response.status).toBe(201);
    expect(spies.insert).toHaveBeenCalledWith({
      announcement_id: 'a-1',
      user_id: 'user-1',
      content: 'Hello',
    });
  });

  it('rejects an empty comment body', async () => {
    mockAuth({ announcement: { id: 'a-1', status: 'published', allow_comments: true } });

    const response = await POST(postRequest(''), PARAMS);
    expect(response.status).toBe(400);
  });
});
