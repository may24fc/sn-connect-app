import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for route protection and redirection.
 *
 * Since authentication is handled client-side via localStorage,
 * this middleware primarily handles route-based redirects.
 *
 * Security Rules (enforced client-side via useRequireAuth):
 * 1. Interns cannot access /payroll routes
 * 2. Regular Admins cannot access /admin/payroll-approvals
 * 3. Only super_admin can access super-admin routes
 *
 * @note In production, replace localStorage auth with JWT validation
 *
 * @security
 * - This is a client-side auth system (not production-ready)
 * - Implement server-side JWT validation for production
 * - Use HttpOnly cookies for token storage
 * - Add CSRF protection
 */

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow all requests to pass through
  // Auth guards are handled by useRequireAuth hook in layouts
  // This middleware will be enhanced with JWT validation in production

  // Optional: Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

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
     * - API routes
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
