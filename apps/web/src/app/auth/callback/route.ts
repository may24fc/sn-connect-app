/**
 * Auth Callback Route Handler
 *
 * This route handles the PKCE code exchange after a user clicks the email
 * confirmation link. Supabase Auth redirects here with a `code` query parameter,
 * which we exchange for a session (stored in httpOnly cookies via @supabase/ssr).
 *
 * Security:
 * - The `code` is a one-time-use authorization code (PKCE flow).
 * - The code_verifier is stored in the Supabase auth cookie, never exposed to JS.
 * - After exchange, the session tokens are written to httpOnly cookies automatically
 *   by the @supabase/ssr createServerClient cookie handlers.
 * - On failure, the user is redirected to login with an error indicator.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

type CookieOptions = { [key: string]: unknown };

type CookieStore = Awaited<ReturnType<typeof cookies>> & {
  set: (options: { name: string; value: string } & CookieOptions) => void;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    // No code present -- likely a direct visit or tampered URL.
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    return NextResponse.redirect(new URL('/login?error=config', origin));
  }

  const cookieStore = (await cookies()) as CookieStore;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Exchange failed -- code expired, already used, or invalid.
    console.error('Auth callback code exchange failed:', error.message);
    return NextResponse.redirect(new URL('/login?error=auth_callback', origin));
  }

  // Successful exchange. Redirect to the intended destination.
  // Ensure the redirect target is a relative path to prevent open-redirect attacks.
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(new URL(safeNext, origin));
}
