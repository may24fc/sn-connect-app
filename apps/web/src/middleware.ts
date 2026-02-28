import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

const publicPaths = new Set<string>([
  '/login',
  '/forgot-password',
  '/forgot-password/confirmation',
  '/reset-password',
]);

const publicPrefixes = ['/api/auth'];
const protectedPrefixes = [
  '/dashboard',
  '/intern',
  '/admin',
  '/super-admin',
  '/information-hub',
  '/onboarding',
];

/**
 * Next.js Middleware for Supabase session refresh + route protection.
 *
 * - Refreshes session tokens on every request.
 * - Guards protected routes with server-side session checks.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
  const supabase = createSupabaseMiddlewareClient(request, response);
  let data: { user?: unknown } | null = null;

  if (supabase) {
    try {
      // SECURITY: Use getUser() to validate JWT with Supabase Auth server.
      // getSession() only reads from cookies and could be tampered with.
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!userError && userData.user) {
        data = { user: userData.user };
      } else {
        data = null;
      }
    } catch (err) {
      // If server-side Supabase call fails, fall back to client-side auth
      // and continue without blocking the request.
      console.error('Supabase middleware session refresh failed:', err);
      data = null;
    }
  }

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    publicPaths.has(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPath = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedPath && !(data && (data as any).user)) {
    // If mock auth is enabled for local development, allow the request
    // to proceed so client-side mock auth can handle authentication.
    if (enableMockAuth) {
      return response;
    }

    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const onboardingExemptPaths = ['/onboarding/setup', '/onboarding/complete'];
  const onboardingGatePaths = ['/dashboard', '/intern/dashboard'];

  // Paths that are exempt from the intern setup redirect
  const internSetupExemptPaths = ['/intern/setup', '/api/internships/initialize'];
  const internSetupGatePaths = ['/intern/dashboard'];

  const isOnboardingExempt =
    onboardingExemptPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/api/onboarding');

  const isInternSetupExempt =
    internSetupExemptPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/onboarding');

  if (supabase && data && (data as any).user && !isOnboardingExempt) {
    const authUser = (data as any).user as {
      id: string;
      app_metadata?: Record<string, unknown>;
    };

    let role: string | null = null;
    if (typeof authUser.app_metadata?.db_role === 'string') {
      role = authUser.app_metadata.db_role;
    }

    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (role === 'employee' || role === 'intern') {
      const { data: onboardingProfile, error: onboardingError } = await supabase
        .from('onboarding_profiles')
        .select('is_completed')
        .eq('user_id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (onboardingError) {
        console.warn(
          'Skipping onboarding gate; failed to fetch onboarding status:',
          onboardingError
        );
        return response;
      }

      const isOnboardingComplete = onboardingProfile?.is_completed ?? false;
      const shouldGateCurrentPath = onboardingGatePaths.some((path) => pathname.startsWith(path));

      if (!isOnboardingComplete && shouldGateCurrentPath) {
        const redirectUrl = new URL('/onboarding/setup', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Intern setup gate: redirect interns without an active internship record
      // to the setup flow so they can self-initialize their record.
      if (
        role === 'intern' &&
        isOnboardingComplete &&
        !isInternSetupExempt &&
        internSetupGatePaths.some((path) => pathname.startsWith(path))
      ) {
        const { data: activeInternship, error: internshipError } = await supabase
          .from('internships')
          .select('id')
          .eq(
            'employee_id',
            (
              await supabase
                .from('employees')
                .select('id')
                .eq('user_id', authUser.id)
                .is('deleted_at', null)
                .maybeSingle()
            ).data?.id ?? ''
          )
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle();

        if (!internshipError && !activeInternship) {
          const redirectUrl = new URL('/intern/setup', request.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  if (!isPublicPath) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  return response;
}

/**
 * Matcher configuration for middleware.
 * Only run middleware on app routes, exclude static assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
