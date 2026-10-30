import { POST } from '@/app/api/documents/upload/route';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { resolveStagedFormData } from '@/lib/storage/upload-staging.server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/active-role', () => ({ getActiveUserRole: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/storage/upload-staging.server', () => ({ resolveStagedFormData: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

function createRequest() {
  const formData = new FormData();
  const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn(async () => new TextEncoder().encode('invoice').buffer),
  });
  formData.append('file', file);
  formData.append('employeeId', '11111111-1111-4111-8111-111111111111');
  formData.append('documentType', 'other');

  return { formData: vi.fn(async () => formData) } as unknown as NextRequest;
}

function setup(options?: { ownerId?: string; uploadError?: { message: string } | null }) {
  const upload = vi.fn(async () =>
    options?.uploadError
      ? { data: null, error: options.uploadError }
      : { data: { path: 'employee/other/invoice.pdf' }, error: null }
  );
  const remove = vi.fn(async () => ({ error: null }));
  const employeeMaybeSingle = vi.fn(async () => ({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: options?.ownerId ?? 'user-1',
    },
    error: null,
  }));
  const employeeIs = vi.fn(() => ({ maybeSingle: employeeMaybeSingle }));
  const employeeEq = vi.fn(() => ({ is: employeeIs }));
  const employeeSelect = vi.fn(() => ({ eq: employeeEq }));

  const documentSingle = vi.fn(async () => ({
    data: { id: 'document-1' },
    error: null,
  }));
  const documentSelect = vi.fn(() => ({ single: documentSingle }));
  const documentInsert = vi.fn(() => ({ select: documentSelect }));

  const admin = {
    from: vi.fn((table: string) =>
      table === 'employees' ? { select: employeeSelect } : { insert: documentInsert }
    ),
    storage: {
      from: vi.fn(() => ({ upload, remove })),
    },
  };
  const server = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
  };

  vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);
  vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);
  vi.mocked(resolveStagedFormData).mockImplementation(async (formData) => formData);

  return { documentInsert, upload };
}

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a privileged super-admin upload after explicit authorization', async () => {
    const { documentInsert, upload } = setup({ ownerId: 'employee-owner' });
    vi.mocked(getActiveUserRole).mockResolvedValue('super_admin');

    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: { id: 'document-1' } });
    expect(upload).toHaveBeenCalledOnce();
    expect(documentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: '11111111-1111-4111-8111-111111111111',
        uploaded_by: 'user-1',
      })
    );
  });

  it('rejects an employee uploading for another employee before storage is mutated', async () => {
    const { documentInsert, upload } = setup({ ownerId: 'user-2' });
    vi.mocked(getActiveUserRole).mockResolvedValue('employee');

    const response = await POST(createRequest());

    expect(response.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
    expect(documentInsert).not.toHaveBeenCalled();
  });

  it('returns a client error when storage rejects the file contract', async () => {
    const { upload } = setup({ uploadError: { message: 'mime type is not supported' } });
    vi.mocked(getActiveUserRole).mockResolvedValue('super_admin');

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'File does not meet the storage requirements',
    });
    expect(upload).toHaveBeenCalledOnce();
  });
});
