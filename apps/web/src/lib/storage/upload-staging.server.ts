import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  STAGED_FIELD_PREFIX,
  type StagedFileReference,
  UPLOAD_STAGING_BUCKET,
} from './upload-staging';

function parseStagedReference(value: string): StagedFileReference | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StagedFileReference).path === 'string' &&
      typeof (parsed as StagedFileReference).name === 'string' &&
      typeof (parsed as StagedFileReference).type === 'string'
    ) {
      return parsed as StagedFileReference;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Replaces staged-file references in a request's FormData with real `File`
 * objects downloaded from the staging bucket, so a route's existing
 * `formData.get('file')` / `getAll('files')` handling works unchanged whether
 * the client posted the file directly or staged it first.
 *
 * Only objects under the caller's own `<user id>/` prefix are accepted, and
 * staged objects are deleted once read (a retry re-stages from the browser).
 * References are dropped when there is no session so the route's own auth
 * check produces the 401.
 */
export async function resolveStagedFormData(formData: FormData): Promise<FormData> {
  const entries = Array.from(formData.entries());
  if (!entries.some(([key]) => key.startsWith(STAGED_FIELD_PREFIX))) {
    return formData;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = new FormData();
  if (!user) {
    for (const [key, value] of entries) {
      if (!key.startsWith(STAGED_FIELD_PREFIX)) resolved.append(key, value);
    }
    return resolved;
  }

  const storage = createSupabaseAdminClient().storage.from(UPLOAD_STAGING_BUCKET);
  const stagedPaths: Array<string> = [];

  try {
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, value]): Promise<[string, FormDataEntryValue]> => {
        if (!key.startsWith(STAGED_FIELD_PREFIX)) {
          return [key, value];
        }

        const reference = typeof value === 'string' ? parseStagedReference(value) : null;
        if (
          !reference ||
          !reference.path.startsWith(`${user.id}/`) ||
          reference.path.includes('..')
        ) {
          throw new Error('Invalid staged upload reference');
        }

        stagedPaths.push(reference.path);
        const { data, error } = await storage.download(reference.path);
        if (error || !data) {
          throw new Error(`Staged upload "${reference.name}" could not be read`);
        }

        return [
          key.slice(STAGED_FIELD_PREFIX.length),
          // Use the browser-reported type, exactly as a direct multipart post would.
          // Storage's own content type defaults to text/plain when none was sent.
          new File([data], reference.name, { type: reference.type }),
        ];
      })
    );

    for (const [key, value] of resolvedEntries) {
      resolved.append(key, value);
    }
    return resolved;
  } finally {
    if (stagedPaths.length > 0) {
      await storage.remove(stagedPaths).catch(() => undefined);
    }
  }
}
