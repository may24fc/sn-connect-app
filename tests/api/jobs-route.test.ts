import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/jobs/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  hasAtsAccess: vi.fn(),
}));

import { POST } from '@/app/api/jobs/route';
import { getAuthedSupabase, hasAtsAccess } from '@/app/api/jobs/_lib';

describe('/api/jobs route', () => {
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
      hasAtsGrant: false,
      error: 'Unauthorized',
    });

    const response = await POST(
      new Request('http://localhost/api/jobs', {
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
      user: { id: 'user-1' },
      role: 'employee',
      hasAtsGrant: false,
      error: null,
    });
    vi.mocked(hasAtsAccess).mockReturnValue(false);

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns 400 for invalid payloads', async () => {
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
      role: 'admin',
      hasAtsGrant: false,
      error: null,
    });
    vi.mocked(hasAtsAccess).mockReturnValue(true);

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      }) as never
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid request body');
  });

  it('creates job and requisition through the transactional RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        id: 'job-1',
        title: 'QA Role',
        is_active: true,
        job_requisition: {
          id: 'req-1',
          total_headcount: 2,
          filled_headcount: 0,
          status: 'open',
        },
      },
      error: null,
    }));
    const supabase = { rpc };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      hasAtsGrant: false,
      error: null,
    });
    vi.mocked(hasAtsAccess).mockReturnValue(true);

    const payload = {
      title: 'QA Role',
      business_unit_id: null,
      department: 'People Ops',
      location: 'Remote',
      total_headcount: 2,
      employment_type: 'full-time',
      description: 'A transactional create route test.',
      requirements: 'Testing',
      benefits: 'Coverage',
      salary_range: 'PHP 1 - 2',
      is_active: true,
      closes_at: null,
    };

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as never
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('create_job_posting_with_requisition', {
      p_title: 'QA Role',
      p_business_unit_id: null,
      p_department: 'People Ops',
      p_location: 'Remote',
      p_total_headcount: 2,
      p_employment_type: 'full-time',
      p_description: 'A transactional create route test.',
      p_requirements: 'Testing',
      p_benefits: 'Coverage',
      p_salary_range: 'PHP 1 - 2',
      p_is_active: true,
      p_closes_at: null,
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'job-1',
        title: 'QA Role',
        is_active: true,
        job_requisition: {
          id: 'req-1',
          total_headcount: 2,
          filled_headcount: 0,
          status: 'open',
        },
      },
    });
  });

  it('returns the RPC error message when transactional creation fails', async () => {
    const supabase = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'Total headcount must be at least 1' },
      })),
    };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      hasAtsGrant: false,
      error: null,
    });
    vi.mocked(hasAtsAccess).mockReturnValue(true);

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'QA Role',
          total_headcount: 1,
          employment_type: 'full-time',
          description: 'Valid payload that forces RPC error mapping.',
          is_active: true,
        }),
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Total headcount must be at least 1' });
  });

  it('allows ATS-granted non-admin users to create jobs', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        id: 'job-2',
        title: 'Recruitment Coordinator',
        is_active: true,
        job_requisition: {
          id: 'req-2',
          total_headcount: 1,
          filled_headcount: 0,
          status: 'open',
        },
      },
      error: null,
    }));
    const supabase = { rpc };

    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase,
      user: { id: 'employee-1' },
      role: 'employee',
      hasAtsGrant: true,
      error: null,
    });
    vi.mocked(hasAtsAccess).mockReturnValue(true);

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Recruitment Coordinator',
          total_headcount: 1,
          employment_type: 'full-time',
          description: 'ATS delegate should be able to create postings.',
          is_active: true,
        }),
      }) as never
    );

    expect(response.status).toBe(201);
  });
});