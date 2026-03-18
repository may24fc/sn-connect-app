import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

/**
 * GET /api/calendar/events
 *
 * Fetches the next upcoming events from a shared company Google Calendar
 * via a Service Account. No per-user OAuth required.
 *
 * Env vars:
 *   GOOGLE_CALENDAR_ID                – calendar to read from
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL      – service account email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY – service account PEM key
 *
 * Returns:
 *   { configured: boolean, data: CalendarEvent[] }
 */

const CACHE_SECONDS = 300; // 5 minutes

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
}

export async function GET(): Promise<NextResponse> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!calendarId || !clientEmail || !privateKey) {
    return NextResponse.json(
      { configured: false, data: [] },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      },
    );
  }

  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        // Handle escaped newlines from env var
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const { data } = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events: CalendarEvent[] = (data.items ?? []).map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      summary: item.summary ?? '(No title)',
      start: item.start?.dateTime ?? item.start?.date ?? '',
      end: item.end?.dateTime ?? item.end?.date ?? '',
      location: item.location ?? null,
      allDay: !item.start?.dateTime,
    }));

    return NextResponse.json(
      { configured: true, data: events },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      },
    );
  } catch (err) {
    console.error('[calendar/events] Google API error:', err);
    return NextResponse.json(
      { configured: true, data: [], error: 'Failed to fetch events' },
      { status: 502 },
    );
  }
}
