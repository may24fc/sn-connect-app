export const KNOWN_DB_ROLES = [
  'employee',
  'associate',
  'admin',
  'super_admin',
  'hr',
  'cos',
  'ceo',
] as const;

export type KnownDbRole = (typeof KNOWN_DB_ROLES)[number];

const KNOWN_DB_ROLE_SET = new Set<string>(KNOWN_DB_ROLES);

/**
 * Maps legacy and malformed role claims to the current canonical role set.
 * Returns null when the claim is unknown so callers can safely fall back to DB lookup.
 */
export function normalizeDbRoleClaim(rawRole: string | null | undefined): KnownDbRole | null {
  if (!rawRole) {
    return null;
  }

  const normalized = rawRole.trim().toLowerCase();
  if (normalized === 'intern') {
    return 'associate';
  }

  if (KNOWN_DB_ROLE_SET.has(normalized)) {
    return normalized as KnownDbRole;
  }

  return null;
}

export function getNormalizedMetadataRole(
  appMetadata: Record<string, unknown> | null | undefined
): KnownDbRole | null {
  const rawRole = typeof appMetadata?.db_role === 'string' ? appMetadata.db_role : null;
  return normalizeDbRoleClaim(rawRole);
}
