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
 *   2. NEXT_PUBLIC_VERCEL_URL (auto-set by Vercel on every deployment)
 *   3. window.location.origin (client-side fallback)
 *   4. http://localhost:3000 (last resort for local dev)
 */

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
  'http://localhost:3000',
  'http://localhost:3001',
  'https://*.vercel.app',
  // Add your production domain(s) below:
  // 'https://your-production-domain.com',
] as const;

/**
 * Checks whether a given origin matches the allowlist.
 * Supports exact matches and simple wildcard prefix patterns (e.g. `https://*.vercel.app`).
 */
export function isAllowedOrigin(origin: string): boolean {
  const normalised = origin.replace(/\/$/, '').toLowerCase();

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
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  // 2. Vercel auto-set variable (available on preview and production deploys)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 3. Client-side fallback
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // 4. Local dev fallback
  return 'http://localhost:3000';
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
 * Returns the redirect URL after a successful signup.
 * Typically this is the email confirmation page, not the app itself
 * (since the user still needs to verify their email).
 *
 * @param email - The email address that was signed up.
 */
export function getPostSignupRedirect(email: string): string {
  return `/signup/confirmation?email=${encodeURIComponent(email)}`;
}

/**
 * Returns the redirect URL for the password reset flow.
 * This is passed to `supabase.auth.resetPasswordForEmail()` as `redirectTo`.
 */
export function getPasswordResetRedirectUrl(): string {
  return `${getSiteUrl()}/reset-password`;
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
