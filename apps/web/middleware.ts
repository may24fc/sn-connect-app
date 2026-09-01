/**
 * Next.js Middleware -- Session Refresh & Basic Route Protection
 *
 * This middleware runs on every matched request and has two responsibilities:
 *
 * 1. SESSION REFRESH: Calls supabase.auth.getUser() to refresh the session cookie
 *    before the request reaches Server Components / API routes. This ensures the
 *    auth cookie is always fresh and prevents stale-session errors.
 *
 * 2. BASIC REDIRECT: If no authenticated user is found and the request is for a
 *    protected route, redirect to /login. This is a UX convenience, NOT a security
 *    boundary. The real security boundary is RLS at the database level.
 *
 * IMPORTANT: Middleware runs at the Edge and cannot perform heavy authorization
 * logic. Never rely on middleware as the sole security gate.
 *
 * When mock auth is enabled (NEXT_PUBLIC_ENABLE_MOCK_AUTH=true), the middleware
 * skips Supabase checks entirely so local development works without a Supabase
 * project. Auth is handled client-side by the AuthContext mock path instead.
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require authentication.
const PUBLIC_ROUTES = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/forgot-password/confirmation',
  '/reset-password',
  '/account-disabled',
]);

// Prefixes that are always public (auth callback, API health, static assets).
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/health',
  '/api/cron/',
  '/_next/',
  '/favicon.ico',
  '/api/webhooks/',
  '/api/inngest',
  '/api/calendar/callback',
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes entirely -- no Supabase call needed.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // When mock auth is enabled, skip all server-side session checks.
  // The client-side AuthContext handles auth via localStorage in this mode.
  const enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
  if (enableMockAuth) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    // Supabase not configured -- let the request through (local dev fallback).
    return NextResponse.next();
  }

  // Create a SINGLE response object and accumulate all cookie changes on it.
  // Previous implementation re-created NextResponse.next() on every set/remove
  // call, which discarded cookies from earlier calls — causing session loss on
  // chunked JWTs (Supabase splits large tokens across multiple cookies).
  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Forward cookies to the request so downstream Server Components see them.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Persist cookies on the response so the browser receives them.
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() makes a round-trip to Supabase Auth servers to validate
  // the JWT. This is intentional -- it ensures the token has not been revoked and
  // refreshes the session cookie if it is near expiry. We do NOT use getSession()
  // here because it only reads the local cookie and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No valid session -- redirect to login with a return-to parameter.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - Public files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
