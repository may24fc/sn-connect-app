# Tickets API

> Audience: Developers

IT and HR support ticket system. Employees and associates submit tickets for issues, requests, or help. Admins and super admins triage, assign, and resolve tickets. Dedicated ticket handlers can be designated to receive and manage tickets.

**Related hooks:** `useTickets`, `useTicket`, `useTicketHandlers`  
**Zod schemas:** `apps/web/src/lib/schemas/ticket.schema.ts`  
**Database tables:** `tickets`, `ticket_comments`, `ticket_attachments`, `ticket_handlers`

---

## Endpoints

### Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tickets` | Any authenticated | List tickets (role-scoped) |
| `POST` | `/api/tickets` | Any authenticated | Submit a new ticket |
| `GET` | `/api/tickets/[id]` | Any authenticated (RLS) | Get ticket detail |
| `PATCH` | `/api/tickets/[id]` | admin/super_admin or owner | Update ticket status or fields |
| `POST` | `/api/tickets/[id]/comments` | Any authenticated (RLS) | Add a comment to a ticket |
| `GET` | `/api/tickets/[id]/comments` | Any authenticated (RLS) | List comments on a ticket |
| `POST` | `/api/tickets/[id]/attachments` | Any authenticated (RLS) | Upload an attachment |
| `GET` | `/api/tickets/assignees` | admin/super_admin | List users eligible for assignment |

### Ticket Handlers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/ticket-handlers` | admin/super_admin | List all designated ticket handlers |
| `POST` | `/api/ticket-handlers` | super_admin | Designate a user as a ticket handler |
| `DELETE` | `/api/ticket-handlers` | super_admin | Remove a ticket handler designation |
| `GET` | `/api/ticket-handlers/me` | Any authenticated | Check if current user is a ticket handler |

---

## Ticket Data Model

### Ticket Object

```json
{
  "id": "uuid",
  "title": "Login page broken on Safari",
  "description": "Cannot log in from Safari 17.3 — button unresponsive.",
  "team": "it",
  "category": "bug",
  "feature_area": "auth",
  "priority": "high",
  "status": "open",
  "steps_to_reproduce": "1. Open Safari. 2. Navigate to /login. 3. Click Sign In.",
  "expected_behavior": "User should be redirected to dashboard.",
  "has_attachments": false,
  "submitted_by": "uuid",
  "assigned_to": "uuid",
  "assigned_by": "uuid",
  "triaged_by": "uuid",
  "triaged_at": "2026-04-01T08:00:00Z",
  "resolution_summary": null,
  "resolved_at": null,
  "created_at": "2026-04-01T07:55:00Z",
  "updated_at": "2026-04-01T08:00:00Z"
}
```

### Enums

| Field | Values |
|-------|--------|
| `team` | `it`, `hr` |
| `category` | `bug`, `feature_request`, `access`, `question`, `incident`, `other` |
| `feature_area` | `auth`, `profile`, `tasks`, `reports`, `invoices`, `performance`, `announcements`, `resources`, `ai`, `directory`, `onboarding`, `other` (nullable) |
| `priority` | `low`, `medium`, `high`, `critical` |
| `status` | `open`, `in_progress`, `resolved`, `closed`, `cancelled` |

---

## GET /api/tickets

List tickets. Employees see their own tickets. Admins and ticket handlers see all tickets.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by status |
| `priority` | string | — | Filter by priority |
| `team` | string | — | Filter by team (`it` or `hr`) |
| `category` | string | — | Filter by category |
| `search` | string | — | Search in title and description |
| `page` | number | `1` | Page number |
| `pageSize` | number | `20` | Items per page |

---

## POST /api/tickets

Submit a new ticket. Sends an in-app notification to ticket handlers.

### Request Body

```json
{
  "title": "Cannot export employee list",
  "description": "The CSV export button does nothing.",
  "team": "it",
  "category": "bug",
  "feature_area": "directory",
  "priority": "medium",
  "steps_to_reproduce": "Go to /admin/directory and click Export.",
  "expected_behavior": "CSV file downloads."
}
```

### Response

`201 Created`

```json
{
  "data": { "id": "uuid", ...ticket }
}
```

---

## PATCH /api/tickets/[id]

Admins and super admins can update any field. Owners can update title/description on `open` tickets only.

### Updatable Fields (admin/super_admin)

- `status` — transitions: `open` → `in_progress` → `resolved` / `closed` / `cancelled`
- `priority`
- `assigned_to`
- `triaged_by`, `triaged_at`
- `resolution_summary`, `resolved_at`

---

## POST /api/tickets/[id]/comments

Add a threaded comment. All participants on the ticket (submitter + assignee) receive an in-app notification.

### Request Body

```json
{
  "body": "We've reproduced the issue — fix shipping in v1.2.3."
}
```
