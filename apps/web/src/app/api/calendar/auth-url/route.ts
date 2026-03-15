import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/calendar/auth-url
 *
 * Generates a Google OAuth2 consent URL for the current user.
 * The user is redirected to Google to grant calendar read access,
 * and Google redirects back to /api/calendar/callback with an auth code.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not configured' },
        { status: 503 }
      );
    }

    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
    const state = user.id; // Used to link the callback to the correct user

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return NextResponse.json({ url: authUrl.toString() });
  } catch (err) {
    console.error('[calendar/auth-url] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
