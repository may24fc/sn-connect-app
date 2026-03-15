import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/calendar/callback
 *
 * Handles the OAuth2 redirect from Google after the user grants consent.
 * Exchanges the authorization code for tokens and stores them in the user's metadata.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user ID
    const error = searchParams.get('error');

    if (error) {
      // User denied the permission or there was an error
      const appUrl = new URL('/calendar', request.url);
      appUrl.searchParams.set('gcal_error', error);
      return NextResponse.redirect(appUrl);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not configured' },
        { status: 503 }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[calendar/callback] Token exchange failed:', errBody);
      const appUrl = new URL('/calendar', request.url);
      appUrl.searchParams.set('gcal_error', 'token_exchange_failed');
      return NextResponse.redirect(appUrl);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Store tokens in user's metadata via admin client
    const supabaseAdmin = createSupabaseAdminClient();
    const expiresAt = Date.now() + (expires_in * 1000);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(state, {
      app_metadata: {
        google_calendar: {
          access_token,
          refresh_token,
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        },
      },
    });

    if (updateError) {
      console.error('[calendar/callback] Failed to store tokens:', updateError);
      const appUrl = new URL('/calendar', request.url);
      appUrl.searchParams.set('gcal_error', 'storage_failed');
      return NextResponse.redirect(appUrl);
    }

    // Redirect back to the calendar page with success
    const appUrl = new URL('/calendar', request.url);
    appUrl.searchParams.set('gcal_connected', 'true');
    return NextResponse.redirect(appUrl);
  } catch (err) {
    console.error('[calendar/callback] unexpected error:', err);
    const appUrl = new URL('/calendar', request.url);
    appUrl.searchParams.set('gcal_error', 'unexpected');
    return NextResponse.redirect(appUrl);
  }
}
