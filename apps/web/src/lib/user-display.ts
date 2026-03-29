export function normalizeDisplayText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildDisplayName(...parts: Array<string | null | undefined>): string {
  return parts.map((part) => normalizeDisplayText(part)).filter(Boolean).join(' ');
}

interface ResolveUserDisplayNameOptions {
  metadataFullName?: string | null;
  metadataName?: string | null;
  metadataFirstName?: string | null;
  metadataLastName?: string | null;
  onboardingFirstName?: string | null;
  onboardingLastName?: string | null;
  fallbackEmail?: string | null;
  fallbackLabel?: string;
}

export function resolveUserDisplayName(options: ResolveUserDisplayNameOptions): string {
  const fallbackLabel = normalizeDisplayText(options.fallbackLabel) || 'User';

  return (
    normalizeDisplayText(options.metadataFullName) ||
    normalizeDisplayText(options.metadataName) ||
    buildDisplayName(options.metadataFirstName, options.metadataLastName) ||
    buildDisplayName(options.onboardingFirstName, options.onboardingLastName) ||
    normalizeDisplayText(options.fallbackEmail) ||
    fallbackLabel
  );
}

export function getDisplayNameInitials(name: string | null | undefined, fallback = 'U'): string {
  const normalizedName = normalizeDisplayText(name);

  if (!normalizedName) {
    return fallback;
  }

  const initials = normalizedName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || fallback;
}