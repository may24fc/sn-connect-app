import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/jobs/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  isJobAdmin: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

import { POST } from '@/app/api/applications/[id]/hire/route';
import { getAuthedSupabase, isJobAdmin } from '@/app/api/jobs/_lib';
import { logActivity } from '@/lib/audit';

describe('/api/applications/[id]/hire route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: null,
      role: null,
      error: 'Unauthorized',
    });

    const response = await POST(new Request('http://localhost/api/applications/app-1/hire') as never, {
      params: Promise.resolve({ id: 'app-1' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for non-admin roles', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
      role: 'employee',
      error: null,
    });
    vi.mocked(isJobAdmin).mockReturnValue(false);

    const response = await POST(new Request('http://localhost/api/applications/app-1/hire') as never, {
      params: Promise.resolve({ id: 'app-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('calls the hire RPC and logs activity on success', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        applicationId: 'app-1',
        jobPostingId: 'job-1',
        requisitionId: 'req-1',
        applicationStatus: 'hired',
        filledHeadcount: 1,
        totalHeadcount: 1,
        requisitionStatus: 'filled',
        postingIsActive: false,
        autoClosed: true,
      },
      error: null,
    }));
    const supabase = { rpc };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isJobAdmin).mockReturnValue(true);

    const response = await POST(new Request('http://localhost/api/applications/app-1/hire') as never, {
      params: Promise.resolve({ id: 'app-1' }),
    });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('hire_job_application_transaction', {
      application_uuid: 'app-1',
    });
    expect(logActivity).toHaveBeenCalledWith(supabase, {
      userId: 'admin-1',
      action: 'hire_job_application',
      tableName: 'job_applications',
      recordId: 'app-1',
      metadata: {
        applicationId: 'app-1',
        jobPostingId: 'job-1',
        requisitionId: 'req-1',
        applicationStatus: 'hired',
        filledHeadcount: 1,
        totalHeadcount: 1,
        requisitionStatus: 'filled',
        postingIsActive: false,
        autoClosed: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        applicationId: 'app-1',
        jobPostingId: 'job-1',
        requisitionId: 'req-1',
        applicationStatus: 'hired',
        filledHeadcount: 1,
        totalHeadcount: 1,
        requisitionStatus: 'filled',
        postingIsActive: false,
        autoClosed: true,
      },
    });
  });

  it('maps RPC not found errors to 404', async () => {
    const supabase = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'Application not found' },
      })),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isJobAdmin).mockReturnValue(true);

    const response = await POST(new Request('http://localhost/api/applications/missing/hire') as never, {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Application not found' });
  });

  it('maps domain validation errors to 400', async () => {
    const supabase = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'Application is not linked to a job posting' },
      })),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isJobAdmin).mockReturnValue(true);

    const response = await POST(new Request('http://localhost/api/applications/app-1/hire') as never, {
      params: Promise.resolve({ id: 'app-1' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Application is not linked to a job posting',
    });
  });

  it('returns 500 for unexpected RPC failures', async () => {
    const supabase = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'Database timeout' },
      })),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      error: null,
    });
    vi.mocked(isJobAdmin).mockReturnValue(true);

    const response = await POST(new Request('http://localhost/api/applications/app-1/hire') as never, {
      params: Promise.resolve({ id: 'app-1' }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Database timeout' });
  });
});