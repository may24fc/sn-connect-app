import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  STAGED_FIELD_PREFIX,
  type StagedFileReference,
  UPLOAD_STAGING_BUCKET,
} from './upload-staging';

const isMockAuth =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production';

/**
 * Uploads every `File` in `formData` straight to Supabase Storage and returns
 * a copy where each file is replaced by a staged reference. Send the result to
 * any API route that reads its body through `resolveStagedFormData`.
 *
 * Without this, files over Vercel's 4.5 MB request body limit are rejected
 * before the route runs. Falls back to the original FormData when no browser
 * Supabase client is configured (mock auth / local without env).
 */
export async function stageFormDataFiles(formData: FormData): Promise<FormData> {
  const entries = Array.from(formData.entries());
  const files = entries
    .map(([, value]) => value)
    .filter((value): value is File => value instanceof File);

  if (files.length === 0 || isMockAuth) {
    return formData;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return formData;
  }

  const response = await fetch('/api/uploads/staging', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: files.map((file) => ({ name: file.name, size: file.size })) }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Failed to prepare upload');
  }

  const { data: targets } = (await response.json()) as {
    data: Array<{ path: string; token: string }>;
  };

  const references = await Promise.all(
    files.map(async (file, index): Promise<StagedFileReference> => {
      const target = targets[index];
      if (!target) {
        throw new Error('Failed to prepare upload');
      }

      const { error } = await supabase.storage
        .from(UPLOAD_STAGING_BUCKET)
        .uploadToSignedUrl(target.path, target.token, file, {
          ...(file.type ? { contentType: file.type } : {}),
        });

      if (error) {
        throw new Error(`Failed to upload "${file.name}". Please try again.`);
      }

      return { path: target.path, name: file.name, type: file.type };
    })
  );

  const staged = new FormData();
  let fileIndex = 0;
  for (const [key, value] of entries) {
    if (value instanceof File) {
      staged.append(`${STAGED_FIELD_PREFIX}${key}`, JSON.stringify(references[fileIndex]));
      fileIndex += 1;
    } else {
      staged.append(key, value);
    }
  }

  return staged;
}
