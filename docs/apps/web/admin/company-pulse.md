# Company Pulse

Company Pulse gives admins a read-only operational view of shared company events sourced from Google Calendar.

## Routes

- `/admin/company-pulse`
- `/super-admin/company-pulse`

## What the Page Shows

- Upcoming event count
- Events scheduled this week
- All-day event count
- Connection status (Connected or Needs setup)
- Live preview widget used across dashboards

## Source of Truth

Google Calendar is the only authoring surface.

1. Create and update events in the shared company calendar.
2. The portal reads those events and propagates them to user dashboards.
3. Dashboard data refreshes on cache intervals (up to a few minutes).

## Required Environment Variables

- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

If these are missing or invalid, the page displays setup guidance and fetch warnings.

## Related Pages

- `/admin/calendar`
- `/super-admin/calendar`

---

Next: [Announcements](announcements.md) · Previous: [Checklists](checklists.md)
