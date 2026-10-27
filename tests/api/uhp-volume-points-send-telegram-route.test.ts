import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: vi.fn(),
}));

import { requireUhpModule } from '../../apps/web/src/app/api/uhp/_lib';
import { POST } from '../../apps/web/src/app/api/uhp/volume-points/send-telegram/route';

describe('POST /api/uhp/volume-points/send-telegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(requireUhpModule).mockResolvedValue({
      ok: true,
      context: { userId: 'user-1', role: 'super_admin' },
    } as never);
  });

  it('rejects users without Volume Points access', async () => {
    vi.mocked(requireUhpModule).mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Forbidden',
    } as never);

    expect((await POST()).status).toBe(403);
  });

  it('returns 503 when the webhook or shared secret is not configured', async () => {
    expect((await POST()).status).toBe(503);
  });

  it('lets a non-admin Volume Points grantee request a digest', async () => {
    vi.mocked(requireUhpModule).mockResolvedValue({
      ok: true,
      context: { userId: 'user-2', role: 'employee' },
    } as never);
    vi.stubEnv('N8N_UHP_VOLUME_POINTS_WEBHOOK_URL', 'https://n8n.example/webhook/uhp-vp');
    vi.stubEnv('N8N_CALLBACK_SECRET', 'test-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    expect((await POST()).status).toBe(200);
  });

  it('starts an authenticated n8n execution for the current user', async () => {
    vi.stubEnv('N8N_UHP_VOLUME_POINTS_WEBHOOK_URL', 'https://n8n.example/webhook/uhp-vp');
    vi.stubEnv('N8N_CALLBACK_SECRET', 'test-secret');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n.example/webhook/uhp-vp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-control-hub-n8n-secret': 'test-secret',
        }),
        body: expect.stringContaining('"requestedBy":"user-1"'),
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"source":"control_hub_button"');
  });

  it('reports an n8n rejection without claiming the notification was sent', async () => {
    vi.stubEnv('N8N_UHP_VOLUME_POINTS_WEBHOOK_URL', 'https://n8n.example/webhook/uhp-vp');
    vi.stubEnv('N8N_CALLBACK_SECRET', 'test-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    expect((await POST()).status).toBe(502);
  });
});
