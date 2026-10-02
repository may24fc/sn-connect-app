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

import {
  VERIFIED_AUTH_SNAPSHOT_HEADER,
  serializeVerifiedAuthSnapshot,
} from '@/lib/auth/request-snapshot';
import { appendServerTiming, recordAuthTiming, startAuthTiming } from '@/lib/auth/timing';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
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

// These API handlers perform their own authenticated-user and role checks close
// to their data access. Exact paths prevent future dashboard APIs from silently
// inheriting this middleware bypass without security coverage.
export const HANDLER_AUTHENTICATED_API_ROUTES = new Set([
  '/api/dashboard/analytics',
  '/api/dashboard/pending',
  '/api/dashboard/stats',
  '/api/dashboard/super-admin-stats',
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isHandlerAuthenticatedApiRoute(pathname: string): boolean {
  return HANDLER_AUTHENTICATED_API_ROUTES.has(pathname);
}

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function createForwardedResponse(headers: Headers, cookies: Array<PendingCookie>): NextResponse {
  const response = NextResponse.next({ request: { headers } });
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes entirely -- no Supabase call needed.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (isHandlerAuthenticatedApiRoute(pathname)) {
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.delete(VERIFIED_AUTH_SNAPSHOT_HEADER);
    return NextResponse.next({ request: { headers: forwardedHeaders } });
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

  const forwardedHeaders = new Headers(request.headers);
  // Never trust a client-provided internal snapshot. It is set only after the
  // Auth server validates this request below.
  forwardedHeaders.delete(VERIFIED_AUTH_SNAPSHOT_HEADER);
  const pendingCookies: Array<PendingCookie> = [];

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
        forwardedHeaders.set('cookie', request.cookies.toString());
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  // IMPORTANT: getUser() makes a round-trip to Supabase Auth servers to validate
  // the JWT. This is intentional -- it ensures the token has not been revoked and
  // refreshes the session cookie if it is near expiry. We do NOT use getSession()
  // here because it only reads the local cookie and can be spoofed.
  const authStartedAt = startAuthTiming();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authDuration = recordAuthTiming({
    layer: 'middleware',
    operation: 'getUser',
    route: pathname,
    startedAt: authStartedAt,
  });

  if (!user) {
    // No valid session -- redirect to login with a return-to parameter.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    const response = NextResponse.redirect(loginUrl);
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    appendServerTiming(response.headers, 'auth_middleware', authDuration, 'Supabase Auth getUser');
    return response;
  }

  forwardedHeaders.set(VERIFIED_AUTH_SNAPSHOT_HEADER, serializeVerifiedAuthSnapshot(user));
  const response = createForwardedResponse(forwardedHeaders, pendingCookies);
  appendServerTiming(response.headers, 'auth_middleware', authDuration, 'Supabase Auth getUser');
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
