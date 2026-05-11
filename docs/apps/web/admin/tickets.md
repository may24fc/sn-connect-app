# Tickets (Admin)

> Audience: Admins, Super Admins, Ticket Handlers

The support ticket system lets employees and interns report issues, request access, or ask for HR/IT help. Admins and designated ticket handlers receive, triage, assign, and resolve tickets.

---

## Navigation

**Admin:** `/admin/tickets`  
**Super Admin:** `/super-admin/tickets`

---

## Dashboard Stats

Four stat cards at the top of the page:

| Card | Description |
|------|-------------|
| **Open** | Unresolved tickets waiting for action |
| **In Progress** | Tickets actively being worked on |
| **Resolved** | Tickets marked resolved |
| **Critical** | High/critical priority open tickets |

---

## Ticket Queue

The queue shows all tickets visible to the current user. Ticket handlers see all tickets. Admins see tickets assigned to their team. Super admins see all tickets across teams.

### Columns

| Column | Description |
|--------|-------------|
| ID | Short ticket reference |
| Title | Issue summary |
| Submitted by | Employee name and role |
| Team | IT or HR |
| Category | Bug, Feature Request, Access, Question, Incident, Other |
| Priority | Low / Medium / High / Critical |
| Status | Open / In Progress / Resolved / Closed / Cancelled |
| Assigned to | Handler name |
| Submitted | Date |

### Filters

- **Team** — IT or HR
- **Category** — Bug, Feature Request, Access, etc.
- **Priority** — Low, Medium, High, Critical
- **Status** — Open, In Progress, Resolved, Closed, Cancelled
- **Search** — Title and description full-text

---

## Viewing a Ticket

Click any row to open the ticket detail slide panel.

The detail view shows:
- Full description and steps to reproduce
- Expected behavior
- Feature area (e.g. Auth, Tasks, Reports)
- Attachments (if any)
- Comment thread
- Audit trail (triaged by, assigned by, resolved by)

---

## Triaging a Ticket

1. Open the ticket.
2. Set **Priority** if different from submitter's self-reported priority.
3. Set **Team** assignment (IT or HR).
4. Click **Triage** — records your user ID and the triage timestamp.

---

## Assigning a Ticket

1. Open the ticket.
2. Select a handler from the **Assign to** dropdown (lists ticket handlers and admins).
3. Click **Assign** — sends an in-app notification to the assigned handler.

---

## Resolving a Ticket

1. Open the ticket.
2. Enter a **Resolution Summary** (required).
3. Click **Mark Resolved** — sets `status = resolved` and `resolved_at`.

The submitter receives an in-app notification when their ticket is resolved.

---

## Closing and Cancelling

| Action | When to use |
|--------|-------------|
| **Close** | Ticket confirmed resolved by submitter or after 7-day timeout |
| **Cancel** | Duplicate or invalid ticket |

---

## Designating Ticket Handlers

Super admins can grant specific users ticket handler status from the **Ticket Handlers** sub-page.

Ticket handlers:
- Receive notifications for all new tickets submitted to their team
- Can see and action all tickets regardless of the submitter
- Are listed in the **Assign to** dropdown

To add a handler:
1. Go to `/super-admin/tickets/handlers`
2. Search for the user
3. Click **Grant Handler Access**

---

## Ticket Status Flow

```
open → in_progress → resolved → closed
  ↓
cancelled
```

Employees can reopen a resolved ticket within 48 hours if the resolution did not fix their issue.
