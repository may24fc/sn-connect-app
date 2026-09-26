import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const download = vi.fn();
const remove = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser } })),
  createSupabaseAdminClient: vi.fn(() => ({
    storage: { from: vi.fn(() => ({ download, remove })) },
  })),
}));

import { STAGED_FIELD_PREFIX } from '@/lib/storage/upload-staging';
import { resolveStagedFormData } from '@/lib/storage/upload-staging.server';

function stagedRef(path: string, name = 'receipt.pdf', type = 'application/pdf'): string {
  return JSON.stringify({ path, name, type });
}

describe('resolveStagedFormData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    download.mockResolvedValue({ data: new Blob(['%PDF-1.4']), error: null });
    remove.mockResolvedValue({ data: [], error: null });
  });

  it('returns the original FormData when nothing is staged', async () => {
    const formData = new FormData();
    formData.append('file', new File(['x'], 'a.txt', { type: 'text/plain' }));

    expect(await resolveStagedFormData(formData)).toBe(formData);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('swaps staged references for Files in their original order and deletes the staged objects', async () => {
    const formData = new FormData();
    formData.append('title', 'first');
    formData.append(`${STAGED_FIELD_PREFIX}files`, stagedRef('user-1/a-receipt.pdf'));
    formData.append('title', 'second');
    formData.append(
      `${STAGED_FIELD_PREFIX}files`,
      stagedRef('user-1/b-shot.png', 'shot.png', 'image/png')
    );

    const resolved = await resolveStagedFormData(formData);
    const files = resolved.getAll('files') as Array<File>;

    expect(Array.from(resolved.keys())).toEqual(['title', 'files', 'title', 'files']);
    expect(files.map((file) => [file.name, file.type])).toEqual([
      ['receipt.pdf', 'application/pdf'],
      ['shot.png', 'image/png'],
    ]);
    expect(remove).toHaveBeenCalledWith(['user-1/a-receipt.pdf', 'user-1/b-shot.png']);
  });

  it("rejects references to another user's staged objects", async () => {
    const formData = new FormData();
    formData.append(`${STAGED_FIELD_PREFIX}file`, stagedRef('user-2/secret.pdf'));

    await expect(resolveStagedFormData(formData)).rejects.toThrow(
      'Invalid staged upload reference'
    );
    expect(download).not.toHaveBeenCalled();
  });

  it('drops staged references when there is no session so the route returns 401', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const formData = new FormData();
    formData.append('label', 'x');
    formData.append(`${STAGED_FIELD_PREFIX}file`, stagedRef('user-1/a.pdf'));

    const resolved = await resolveStagedFormData(formData);

    expect(resolved.get('file')).toBeNull();
    expect(resolved.get('label')).toBe('x');
  });
});
