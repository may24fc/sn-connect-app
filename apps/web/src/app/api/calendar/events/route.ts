import { createCompanyCalendarNotifications } from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getCompanyCalendarDate, type CompanyCalendarEvent } from '@/lib/company-calendar';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { calendar_v3, google } from 'googleapis';

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
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

interface SyncStateRow {
  id: boolean;
  initialized_at: string | null;
}

function parseDateParam(value: string | null): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function mapGoogleEvent(item: calendar_v3.Schema$Event): CompanyCalendarEvent {
  const allDay = !item.start?.dateTime;
  const start = item.start?.dateTime ?? item.start?.date ?? '';
  const end = item.end?.dateTime ?? item.end?.date ?? start;

  return {
    id: item.id ?? crypto.randomUUID(),
    summary: item.summary ?? '(No title)',
    start,
    end,
    location: item.location ?? null,
    allDay,
    htmlLink: item.htmlLink ?? null,
    createdAt: item.created ?? null,
  };
}

async function syncCalendarNotifications(events: Array<CompanyCalendarEvent>): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const upcomingEvents = events.filter((event) => {
    const endDate = getCompanyCalendarDate(event.end || event.start, event.allDay);
    return endDate.getTime() >= Date.now();
  });

  const syncRows = upcomingEvents.map((event) => ({
    google_event_id: event.id,
    summary: event.summary,
    start_time: getCompanyCalendarDate(event.start, event.allDay).toISOString(),
    end_time: getCompanyCalendarDate(event.end || event.start, event.allDay).toISOString(),
    all_day: event.allDay,
    location: event.location,
    html_link: event.htmlLink ?? null,
    source_created_at: event.createdAt ?? null,
    last_seen_at: nowIso,
  }));

  const { data: stateData, error: stateError } = await admin
    .from('company_calendar_sync_state')
    .select('id, initialized_at')
    .eq('id', true)
    .maybeSingle<SyncStateRow>();

  if (stateError) {
    console.error('[calendar/events] Failed to load sync state:', stateError);
    return;
  }

  if (!stateData) {
    const { error: insertStateError } = await admin
      .from('company_calendar_sync_state')
      .insert({ id: true, last_synced_at: nowIso });

    if (insertStateError) {
      console.error('[calendar/events] Failed to initialize sync state:', insertStateError);
      return;
    }
  }

  const initializedAt = stateData?.initialized_at ?? null;

  if (!initializedAt) {
    if (syncRows.length > 0) {
      const { error: bootstrapError } = await admin
        .from('company_calendar_event_sync')
        .upsert(syncRows, { onConflict: 'google_event_id' });

      if (bootstrapError) {
        console.error('[calendar/events] Failed to bootstrap calendar sync:', bootstrapError);
        return;
      }
    }

    const { error: initializeError } = await admin
      .from('company_calendar_sync_state')
      .upsert({ id: true, initialized_at: nowIso, last_synced_at: nowIso });

    if (initializeError) {
      console.error('[calendar/events] Failed to mark calendar sync initialized:', initializeError);
    }

    return;
  }

  let insertedIds = new Set<string>();

  if (syncRows.length > 0) {
    const { data: insertedRows, error: detectError } = await admin
      .from('company_calendar_event_sync')
      .upsert(syncRows, { onConflict: 'google_event_id', ignoreDuplicates: true })
      .select('google_event_id');

    if (detectError) {
      console.error('[calendar/events] Failed to detect new calendar events:', detectError);
      return;
    }

    insertedIds = new Set((insertedRows ?? []).map((row) => row.google_event_id as string));

    const { error: refreshError } = await admin
      .from('company_calendar_event_sync')
      .upsert(syncRows, { onConflict: 'google_event_id' });

    if (refreshError) {
      console.error('[calendar/events] Failed to refresh calendar sync rows:', refreshError);
    }
  }

  const newEvents = upcomingEvents.filter((event) => insertedIds.has(event.id));

  if (newEvents.length > 0) {
    await createCompanyCalendarNotifications(newEvents);

    const { error: markedError } = await admin
      .from('company_calendar_event_sync')
      .update({ notification_sent_at: nowIso, last_seen_at: nowIso })
      .in('google_event_id', newEvents.map((event) => event.id));

    if (markedError) {
      console.error('[calendar/events] Failed to mark new calendar notifications sent:', markedError);
    }
  }

  const { error: syncStateError } = await admin
    .from('company_calendar_sync_state')
    .upsert({ id: true, initialized_at: initializedAt, last_synced_at: nowIso });

  if (syncStateError) {
    console.error('[calendar/events] Failed to update sync state timestamp:', syncStateError);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const start = parseDateParam(request.nextUrl.searchParams.get('start'));
  const end = parseDateParam(request.nextUrl.searchParams.get('end'));
  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const maxResults = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

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
      timeMin: start ?? new Date().toISOString(),
      ...(end ? { timeMax: end } : {}),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (data.items ?? []).map(mapGoogleEvent);

    await syncCalendarNotifications(events);

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
