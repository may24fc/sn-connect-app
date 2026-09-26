import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/internships/_lib', () => ({
  getAuthedInternshipContext: vi.fn(),
  canAccessInternship: vi.fn(),
}));

const createSignedUrl = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  })),
}));

import { GET } from '@/app/api/internships/[id]/logs/[logId]/attachments/route';
import { canAccessInternship, getAuthedInternshipContext } from '@/app/api/internships/_lib';

const INTERNSHIP_ID = '11111111-1111-4111-8111-111111111111';
const LOG_ID = '22222222-2222-4222-8222-222222222222';

function createSupabase(logRow: Record<string, unknown> | null) {
  const eqCalls: Array<[string, string]> = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push([column, value]);
      return query;
    }),
    maybeSingle: vi.fn(async () => ({ data: logRow, error: null })),
  };
  return { supabase: { from: vi.fn(() => query) }, eqCalls };
}

function callRoute() {
  return GET(
    new NextRequest(`http://localhost/api/internships/${INTERNSHIP_ID}/logs/${LOG_ID}/attachments`),
    { params: Promise.resolve({ id: INTERNSHIP_ID, logId: LOG_ID }) }
  );
}

describe('GET /api/internships/[id]/logs/[logId]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed/shot.png' },
      error: null,
    });
  });

  it('returns 403 when the caller cannot access the internship', async () => {
    const { supabase } = createSupabase(null);
    vi.mocked(getAuthedInternshipContext).mockResolvedValue({
      supabase,
      user: { id: 'u1' },
      role: 'employee',
      error: null,
    } as never);
    vi.mocked(canAccessInternship).mockResolvedValue({
      allowed: false,
      internship: null,
      employeeId: null,
    });

    const response = await callRoute();
    expect(response.status).toBe(403);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('signs storage attachments and passes links through', async () => {
    const { supabase, eqCalls } = createSupabase({
      attachments: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          fileName: 'shot.png',
          filePath: `${INTERNSHIP_ID}/${LOG_ID}/a-shot.png`,
          fileSize: 1200,
          mimeType: 'image/png',
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          fileName: 'example.com/doc',
          filePath: 'https://example.com/doc',
          fileSize: 0,
          mimeType: 'text/uri-list',
        },
      ],
    });
    vi.mocked(getAuthedInternshipContext).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    } as never);
    vi.mocked(canAccessInternship).mockResolvedValue({
      allowed: true,
      internship: { id: INTERNSHIP_ID },
      employeeId: 'emp-1',
    });

    const response = await callRoute();
    const body = (await response.json()) as { data: Array<{ signedUrl: string | null }> };

    expect(response.status).toBe(200);
    expect(eqCalls).toEqual([
      ['id', LOG_ID],
      ['internship_id', INTERNSHIP_ID],
    ]);
    expect(body.data.map((attachment) => attachment.signedUrl)).toEqual([
      'https://signed/shot.png',
      'https://example.com/doc',
    ]);
  });
});
