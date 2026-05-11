# Calendar API

> Audience: Developers

Company calendar integration. Reads upcoming events from a shared Google Calendar via a Service Account — no per-user OAuth is required.

**Related hooks:** `useCalendarEvents`  
**Related component:** `apps/web/src/app/(admin)/admin/calendar/page.tsx`, `apps/web/src/app/(employee)/calendar/page.tsx`  
**Env vars required:** `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/calendar/events` | Any authenticated | Fetch upcoming company calendar events |

---

## GET /api/calendar/events

Fetches upcoming events from the configured company Google Calendar. Results are cached for 5 minutes (`Cache-Control: s-maxage=300`).

When the Google Calendar integration is not configured (missing env vars), the endpoint returns `{ configured: false, data: [] }` rather than an error, allowing the UI to show a friendly setup prompt.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `10` | Maximum number of events to return (max 200) |
| `timeMin` | ISO 8601 | now | Return events starting from this time |
| `timeMax` | ISO 8601 | — | Return events up to this time |

### Response (configured)

```json
{
  "configured": true,
  "data": [
    {
      "id": "google-event-id",
      "title": "Company All-Hands",
      "description": "Quarterly company-wide meeting.",
      "start": "2026-05-10T09:00:00+08:00",
      "end": "2026-05-10T11:00:00+08:00",
      "allDay": false,
      "location": "Main Conference Room / Zoom",
      "htmlLink": "https://calendar.google.com/event?eid=..."
    }
  ]
}
```

### Response (not configured)

```json
{
  "configured": false,
  "data": []
}
```

---

## Event Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Google Calendar event ID |
| `title` | string | Event summary |
| `description` | string \| null | Event description |
| `start` | ISO 8601 string | Start datetime (or date for all-day) |
| `end` | ISO 8601 string | End datetime (or date for all-day) |
| `allDay` | boolean | True if this is a full-day event |
| `location` | string \| null | Physical or virtual location |
| `htmlLink` | string \| null | Direct link to the Google Calendar event |

---

## Setup

1. Create a Google Cloud Service Account with read access to the shared calendar.
2. Share the target Google Calendar with the service account email.
3. Set these environment variables:

```env
GOOGLE_CALENDAR_ID=your-calendar@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=sn-calendar@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

4. The calendar page will automatically transition from the "not configured" empty state to displaying live events.

---

## Notifications

When new events are detected and a sync state is not yet initialized, the system sends in-app notifications to all admin and super admin users via `createCompanyCalendarNotifications`.
