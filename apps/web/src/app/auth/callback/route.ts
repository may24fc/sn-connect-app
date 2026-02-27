/**
 * Auth Callback Route Handler
 *
 * This route handles the PKCE code exchange after a user clicks the email
 * confirmation link or password reset link. Supabase Auth redirects here
 * with a `code` query parameter, which we exchange for a session (stored
 * in httpOnly cookies via @supabase/ssr).
 *
 * Environment Handling:
 * - Works on localhost, Vercel preview deployments, and production.
 * - The `next` parameter is validated against an allowlist of origins to
 *   prevent open-redirect attacks (see redirect-config.ts).
 * - Uses `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_VERCEL_URL` to build the
 *   correct redirect base URL, falling back to the request origin.
 *
 * Security:
 * - The `code` is a one-time-use authorization code (PKCE flow).
 * - The code_verifier is stored in the Supabase auth cookie, never exposed to JS.
 * - After exchange, the session tokens are written to httpOnly cookies automatically
 *   by the @supabase/ssr createServerClient cookie handlers.
 * - The `next` redirect target is validated against an explicit allowlist.
 * - On failure, the user is redirected to login with an error indicator.
 *
 * Attack Vectors Mitigated:
 * - Open redirect: `next` param validated via isAllowedOrigin + relative-path check.
 * - Session hijacking: Tokens stored in httpOnly cookies, never accessible to JS.
 * - PKCE replay: One-time code exchange; replayed codes are rejected by Supabase.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import { validateRedirectTarget } from '@/lib/auth/redirect-config';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    // No code present -- likely a direct visit or tampered URL.
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    return NextResponse.redirect(new URL('/login?error=config', origin));
  }

  // Use the modern getAll/setAll cookie pattern recommended by @supabase/ssr.
  // This correctly handles chunked JWTs (large tokens split across multiple cookies)
  // which the older get/set/remove pattern silently drops.
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Exchange failed -- code expired, already used, or invalid.
    // Do NOT log the code itself — it's a sensitive one-time credential.
    console.error('Auth callback code exchange failed:', error.message);
    return NextResponse.redirect(new URL('/login?error=auth_callback', origin));
  }

  // Validate the `next` redirect target against the allowlist.
  // This prevents open-redirect attacks where an attacker crafts a callback URL
  // with `next=https://evil.com` to steal the session after a successful exchange.
  const safeNext = validateRedirectTarget(next, '/dashboard');
  return NextResponse.redirect(new URL(safeNext, origin));
}
