/**
 * Centralized Auth Redirect Configuration
 *
 * All redirect URL logic lives here to avoid scattered `window.location.origin`
 * calls and inconsistent redirect handling across the codebase.
 *
 * Security:
 * - Validates redirect targets against an explicit allowlist of origins.
 * - Prevents open-redirect attacks by rejecting unknown origins.
 * - Works across all environments: localhost, Vercel previews, and production.
 *
 * Environment Variable Priority:
 *   1. NEXT_PUBLIC_SITE_URL (explicitly set — takes precedence)
 *   2. NEXT_PUBLIC_VERCEL_URL / VERCEL_URL (preview deployments)
 *   3. window.location.origin (client-side fallback)
 *   4. http://localhost:3001 (last resort for local dev)
 */

const PRODUCTION_APP_URL = 'https://app.sngroup.com.au';
const PRODUCTION_PUBLIC_URL = 'https://www.sngroup.com.au';
const LOCAL_APP_URL = 'http://localhost:3001';

function normaliseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalRuntime(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

// ---------------------------------------------------------------------------
// Allowed Origins
// ---------------------------------------------------------------------------

/**
 * Origins that are allowed as redirect targets for auth flows.
 * Wildcard patterns use simple suffix matching for Vercel preview URLs.
 *
 * IMPORTANT: When deploying to a custom domain, add it here AND in Supabase
 * Dashboard → Authentication → URL Configuration → Redirect URLs.
 */
const ALLOWED_ORIGIN_PATTERNS: readonly string[] = [
  ...(isLocalRuntime() ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  'https://*.vercel.app',
  PRODUCTION_APP_URL,
  'https://sngroup.com.au',
  PRODUCTION_PUBLIC_URL,
] as const;

/**
 * Checks whether a given origin matches the allowlist.
 * Supports exact matches and simple wildcard prefix patterns (e.g. `https://*.vercel.app`).
 */
export function isAllowedOrigin(origin: string): boolean {
  const normalised = normaliseUrl(origin).toLowerCase();

  for (const pattern of ALLOWED_ORIGIN_PATTERNS) {
    const normalisedPattern = pattern.toLowerCase();

    if (normalisedPattern.includes('*')) {
      // Wildcard pattern: `https://*.vercel.app` → match any subdomain
      const [scheme, rest] = normalisedPattern.split('://');
      if (!rest) continue;

      const suffix = rest.replace('*.', '');
      const [originScheme, originHost] = normalised.split('://');
      if (!originHost) continue;

      if (originScheme === scheme && (originHost === suffix || originHost.endsWith(`.${suffix}`))) {
        return true;
      }
    } else if (normalised === normalisedPattern) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Site URL Resolution
// ---------------------------------------------------------------------------

/**
 * Returns the canonical site URL for the current environment.
 *
 * Server-side: relies on env vars only (no `window`).
 * Client-side: prefers env vars, falls back to `window.location.origin`.
 */
export function getSiteUrl(): string {
  // 1. Explicit override via NEXT_PUBLIC_SITE_URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normaliseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  // 2. Vercel preview URLs when an explicit site URL is not configured.
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercelUrl && process.env.VERCEL_ENV === 'preview') {
    return `https://${vercelUrl}`;
  }

  // 3. Client-side fallback
  if (typeof window !== 'undefined') {
    const origin = normaliseUrl(window.location.origin);

    if (isLocalRuntime()) {
      return LOCAL_APP_URL;
    }

    if (origin === 'http://localhost:3000' || origin === 'http://localhost:3001') {
      return PRODUCTION_APP_URL;
    }

    return origin;
  }

  // 4. Local dev fallback
  return isLocalRuntime() ? LOCAL_APP_URL : PRODUCTION_APP_URL;
}

// ---------------------------------------------------------------------------
// Auth URL Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the full URL for the auth callback route.
 * Used as `emailRedirectTo` in Supabase signup and password reset flows.
 *
 * Under the hood Supabase will append `?code=<TOKEN>` (PKCE) to this URL
 * when the user clicks the confirmation link.
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/**
 * Returns the canonical login URL for account emails and cross-app CTAs.
 */
export function getLoginUrl(): string {
  return `${getSiteUrl()}/login`;
}

/**
 * Returns the redirect URL after a user successfully logs in.
 * Respects a `returnTo` query parameter if present (client-side only).
 *
 * @param role - The user's resolved UI role (used for role-based landing pages).
 * @param returnTo - Optional path the user was trying to access before being redirected.
 */
export function getPostLoginRedirect(role?: string, returnTo?: string | null): string {
  // If a safe returnTo path was provided, use it.
  if (returnTo && returnTo.startsWith('/')) {
    return returnTo;
  }

  // Role-based default landing pages.
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'intern':
      return '/intern/dashboard';
    case 'employee':
    default:
      return '/dashboard';
  }
}

/**
 * Returns the redirect URL for the password reset flow.
 * This is passed to `supabase.auth.resetPasswordForEmail()` as `redirectTo`.
 */
export function getPasswordResetRedirectUrl(): string {
  return `${getSiteUrl()}/reset-password`;
}

/**
 * Returns the confirmation page shown after a user signs up.
 */
export function getPostSignupRedirect(email?: string | null): string {
  if (email) {
    return `/signup/confirmation?email=${encodeURIComponent(email)}`;
  }

  return '/signup/confirmation';
}

/**
 * Validates a `next` parameter from a callback URL against the allowlist.
 * Returns the sanitised path if valid, or a safe default otherwise.
 *
 * Security: Prevents open-redirect attacks by ensuring the `next` target
 * is either a relative path or points to an allowed origin.
 *
 * @param next - The raw `next` query parameter value.
 * @param fallback - Default path if validation fails (default: '/dashboard').
 */
export function validateRedirectTarget(
  next: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!next) return fallback;

  // Relative paths are always safe.
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  // Absolute URLs — check origin against allowlist.
  try {
    const url = new URL(next);
    if (isAllowedOrigin(url.origin)) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Invalid URL — fall through to default.
  }

  return fallback;
}
