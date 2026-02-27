/**
 * API Auth Callback Route (Legacy Path)
 *
 * This route exists at /api/auth/callback as a secondary callback endpoint.
 * The primary callback is at /auth/callback. Both use the same PKCE exchange
 * flow and redirect validation logic.
 *
 * @see /auth/callback/route.ts for the primary implementation.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { validateRedirectTarget } from '@/lib/auth/redirect-config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('API auth callback code exchange failed:', error.message);
      return NextResponse.redirect(
        new URL('/login?error=auth_callback', requestUrl.origin)
      );
    }
  } else {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', requestUrl.origin)
    );
  }

  const safeNext = validateRedirectTarget(next, '/dashboard');
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
