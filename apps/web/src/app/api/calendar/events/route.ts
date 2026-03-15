import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/calendar/events
 *
 * Fetches the authenticated user's Google Calendar events.
 * Reads stored OAuth tokens from user app_metadata, refreshes if expired,
 * and calls the Google Calendar API.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gcal = user.app_metadata?.google_calendar as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    } | undefined;

    if (!gcal?.access_token) {
      return NextResponse.json({ connected: false, data: [] });
    }

    let accessToken = gcal.access_token;

    // Refresh token if expired
    if (gcal.expires_at && Date.now() > gcal.expires_at - 60_000) {
      const refreshed = await refreshAccessToken(gcal.refresh_token, user.id);
      if (refreshed) {
        accessToken = refreshed;
      } else {
        // Refresh failed — mark as disconnected
        return NextResponse.json({ connected: false, data: [], error: 'token_expired' });
      }
    }

    // Parse query params for time range
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') ?? new Date().toISOString();
    const timeMax = searchParams.get('timeMax') ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
    const maxResults = Math.min(50, Number(searchParams.get('maxResults')) || 20);

    // Fetch events from Google Calendar API
    const calUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    calUrl.searchParams.set('timeMin', timeMin);
    calUrl.searchParams.set('timeMax', timeMax);
    calUrl.searchParams.set('maxResults', String(maxResults));
    calUrl.searchParams.set('singleEvents', 'true');
    calUrl.searchParams.set('orderBy', 'startTime');

    const calResponse = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!calResponse.ok) {
      if (calResponse.status === 401) {
        return NextResponse.json({ connected: false, data: [], error: 'token_expired' });
      }
      const errText = await calResponse.text();
      console.error('[calendar/events] Google API error:', calResponse.status, errText);
      return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 502 });
    }

    const calData = await calResponse.json();

    // Transform Google Calendar events to our format
    const events = (calData.items ?? []).map((item: GoogleCalendarEvent) => ({
      id: item.id,
      title: item.summary ?? '(No title)',
      description: item.description ?? null,
      start: item.start?.dateTime ?? item.start?.date ?? null,
      end: item.end?.dateTime ?? item.end?.date ?? null,
      allDay: !item.start?.dateTime,
      location: item.location ?? null,
      htmlLink: item.htmlLink ?? null,
      status: item.status ?? 'confirmed',
    }));

    return NextResponse.json({ connected: true, data: events });
  } catch (err) {
    console.error('[calendar/events] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
  status?: string;
}

/**
 * Refresh the Google OAuth access token using the stored refresh token.
 * On success, updates the user's app_metadata with the new token.
 */
async function refreshAccessToken(
  refreshToken: string | undefined,
  userId: string
): Promise<string | null> {
  if (!refreshToken) return null;

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const { access_token, expires_in } = data;

    // Update stored tokens
    const supabaseAdmin = createSupabaseAdminClient();
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: {
        google_calendar: {
          access_token,
          refresh_token: refreshToken,
          expires_at: Date.now() + (expires_in * 1000),
          connected_at: new Date().toISOString(),
        },
      },
    });

    return access_token;
  } catch {
    return null;
  }
}
