import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/ai/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  getAdminClient: vi.fn(),
  isAiAdmin: vi.fn(),
}));

import { POST } from '@/app/api/ai/suggestions/click/route';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '@/app/api/ai/_lib';

describe('/api/ai/suggestions/click route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: null,
      role: null,
      error: 'Unauthorized',
    });

    const response = await POST(
      new Request('http://localhost/api/ai/suggestions/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin roles', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'employee-1' },
      role: 'employee',
      error: null,
    });
    vi.mocked(isAiAdmin).mockReturnValue(false);

    const response = await POST(
      new Request('http://localhost/api/ai/suggestions/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: 'suggestion-1',
          label: 'Leave policy',
          prompt: 'What does the leave policy cover?',
          surface: 'admin_chatbot',
          path: '/admin/ai-knowledge',
        }),
      }) as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('writes admin suggestion click analytics to audit_logs', async () => {
    const insert = vi.fn(async () => ({ error: null }));

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isAiAdmin).mockReturnValue(true);
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn(() => ({ insert })),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/ai/suggestions/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: 'suggestion-2',
          label: 'Onboarding guide',
          prompt: 'What should I complete during onboarding?',
          surface: 'admin_chatbot',
          path: '/admin/dashboard',
          conversationId: null,
          wasFirstMessage: true,
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      table_name: 'ai_chat',
      record_id: 'admin-1',
      operation: 'INSERT',
      performed_by: 'admin-1',
      action: 'ai_chat_suggestion_click',
      metadata: {
        title: 'Onboarding guide',
        suggestion_id: 'suggestion-2',
        prompt: 'What should I complete during onboarding?',
        surface: 'admin_chatbot',
        path: '/admin/dashboard',
        conversation_id: null,
        was_first_message: true,
      },
    });
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});