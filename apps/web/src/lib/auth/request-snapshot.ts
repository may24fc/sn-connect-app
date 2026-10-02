import type { AuthUserLike } from '@/lib/auth/user-bootstrap';

export const VERIFIED_AUTH_SNAPSHOT_HEADER = 'x-sn-verified-auth-snapshot';

const MAX_SNAPSHOT_LENGTH = 4096;
const ALLOWED_APP_METADATA_FIELDS = ['db_role'] as const;
const ALLOWED_USER_METADATA_FIELDS = [
  'avatar_url',
  'first_name',
  'full_name',
  'last_name',
  'name',
] as const;

function pickStringFields(
  source: Record<string, unknown> | undefined,
  fields: ReadonlyArray<string>
): Record<string, string> {
  const selected: Record<string, string> = {};

  for (const field of fields) {
    const value = source?.[field];
    if (typeof value === 'string') {
      selected[field] = value;
    }
  }

  return selected;
}

/**
 * Creates a compact, ASCII-safe request header from a user that middleware has
 * already verified with Supabase Auth. The value is forwarded upstream only and
 * is never exposed as a response header.
 */
export function serializeVerifiedAuthSnapshot(user: AuthUserLike): string {
  return encodeURIComponent(
    JSON.stringify({
      id: user.id,
      email: user.email ?? null,
      app_metadata: pickStringFields(user.app_metadata, ALLOWED_APP_METADATA_FIELDS),
      user_metadata: pickStringFields(user.user_metadata, ALLOWED_USER_METADATA_FIELDS),
    })
  );
}

export function parseVerifiedAuthSnapshot(value: string | null): AuthUserLike | null {
  if (!value || value.length > MAX_SNAPSHOT_LENGTH) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
    if (typeof parsed.id !== 'string' || parsed.id.length === 0 || parsed.id.length > 256) {
      return null;
    }

    const email = parsed.email;
    if (!(email === null || email === undefined || typeof email === 'string')) {
      return null;
    }

    const appMetadata =
      parsed.app_metadata && typeof parsed.app_metadata === 'object'
        ? (parsed.app_metadata as Record<string, unknown>)
        : undefined;
    const userMetadata =
      parsed.user_metadata && typeof parsed.user_metadata === 'object'
        ? (parsed.user_metadata as Record<string, unknown>)
        : undefined;

    return {
      id: parsed.id,
      email: email ?? null,
      app_metadata: pickStringFields(appMetadata, ALLOWED_APP_METADATA_FIELDS),
      user_metadata: pickStringFields(userMetadata, ALLOWED_USER_METADATA_FIELDS),
    };
  } catch {
    return null;
  }
}
