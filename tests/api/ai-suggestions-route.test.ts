import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/ai/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  getAdminClient: vi.fn(),
  getAllowedKnowledgeAccessLevels: vi.fn(),
}));

import { GET } from '@/app/api/ai/suggestions/route';
import {
  getAdminClient,
  getAllowedKnowledgeAccessLevels,
  getAuthedSupabase,
} from '@/app/api/ai/_lib';

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

describe('/api/ai/suggestions route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = '';
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: null,
      role: null,
      error: 'Unauthorized',
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns role-filtered fallback suggestions with Google Docs freshness metadata', async () => {
    const sourceRows = [
      {
        id: 'source-1',
        title: 'Leave Policy Handbook',
        description: 'Vacation, PTO, and holiday coverage for employees.',
        tags: ['leave', 'pto'],
        source_type: 'pdf',
        updated_at: '2026-03-29T08:00:00.000Z',
        metadata: null,
        access_level: 'all',
      },
      {
        id: 'source-2',
        title: 'Onboarding Guide',
        description: 'Orientation tasks and first-week guidance.',
        tags: ['onboarding'],
        source_type: 'url',
        updated_at: '2026-03-29T09:30:00.000Z',
        metadata: { google_drive_file_id: 'drive-doc-1' },
        access_level: 'all',
      },
    ];
    const chunkRows = [
      {
        source_id: 'source-1',
        chunk_text: 'Employees receive annual leave, sick leave, and holiday coverage based on tenure.',
        chunk_index: 0,
      },
      {
        source_id: 'source-2',
        chunk_text: 'New hires should complete onboarding tasks, review orientation materials, and confirm accounts.',
        chunk_index: 0,
      },
    ];

    const sourceQuery = createQueryBuilder({ data: sourceRows, error: null });
    const liveSyncQuery = createQueryBuilder({
      data: [
        {
          id: 'drive-latest',
          title: 'Watched Team Update',
          updated_at: '2026-03-29T10:00:00.000Z',
          metadata: { google_drive_file_id: 'drive-doc-2' },
        },
      ],
      error: null,
    });
    const chunkQuery = createQueryBuilder({ data: chunkRows, error: null });

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'employee-1' },
      role: 'employee',
      error: null,
    });
    vi.mocked(getAllowedKnowledgeAccessLevels).mockReturnValue(['all']);
    let sourceCallCount = 0;
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'knowledge_sources') {
          sourceCallCount += 1;
          return sourceCallCount === 1 ? sourceQuery : liveSyncQuery;
        }
        if (table === 'knowledge_embeddings') {
          return chunkQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(sourceQuery.in).toHaveBeenCalledWith('access_level', ['all']);
    expect(json.liveSync).toEqual({
      hasSyncedGoogleDocs: true,
      syncedDocumentCount: 1,
      lastSyncedAt: '2026-03-29T10:00:00.000Z',
      lastSyncedTitle: 'Watched Team Update',
    });
    expect(json.data.length).toBeGreaterThanOrEqual(4);
    expect(json.data.length).toBeLessThanOrEqual(6);
    expect(json.data.some((item: { prompt: string }) => item.prompt.includes('leave policy'))).toBe(true);
    expect(json.data.some((item: { prompt: string }) => item.prompt.includes('onboarding'))).toBe(true);
  });
});