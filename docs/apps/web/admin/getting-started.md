# Admin Getting Started

This guide provides an orientation for HR Administrators and Super Admins.

## Admin Dashboard (`/admin/dashboard`)

After logging in as an admin, your dashboard shows:

### Welcome Header

Personalized greeting with a **"Manage Employees"** shortcut button.

### Stats Row

| Card | Description |
|------|-------------|
| **Total Employees** | Company-wide headcount (from `/api/dashboard/stats`) |
| **Active Associates** | Currently active associate count |
| **Reviews Due** | Performance reviews needing attention |

### Needs Attention Carousel

Role-aware action banners at the top of the dashboard combine live operational concerns from the dashboard API, onboarding approvals, and probation monitoring.

- Admin sees live banners for reports, late associate EODs, onboarding approvals, probation follow-ups, and pending reviews
- Super Admin sees the same operational items plus payroll approvals when present
- Each slide links directly to the relevant work area
- Empty state falls back to **"All caught up!"** when no concerns are active

### Department Overview

- Headcount bars by department
- Open positions badges
- **"Manage"** link to department details

### Recent Activity

Timeline of HR events:

- New employees onboarded
- Performance reviews completed
- Timestamps for each action

Use the sidebar to move from the dashboard into Employee Management, Performance, Jobs, Reports, and the rest of the admin work areas.

## Super Admin Dashboard (`/super-admin/dashboard`)

The Super Admin dashboard adds system-level monitoring:

| Card | Description |
|------|-------------|
| **Total Users** | All users with active count |
| **System Uptime** | Platform availability percentage |
| **Security Alerts** | Login attempts, permission changes, data access events |
| **Audit Logs** | Count of system actions logged |

Additional sections:

- **System Health** — Live status of database, API, authentication, and file storage services
- **User Role Distribution** — Breakdown by role with counts and percentages
- **Recent Audit Logs** — Timeline of system-level actions

## Common Admin Tasks

| Task | Where to Go |
|------|-------------|
| Invite a new employee | Employee Management → Invite |
| Approve onboarding | Employee Management → Pending approvals |
| View employee directory | Directory → Search/Filter |
| Export directory CSV | Directory → Export |
| Create a job posting | Jobs → Create New |
| Review applications | Jobs → Applications |
| Create a performance cycle | Performance → Manage Cycles |
| Review associate reports | Associates → Select associate → Reports |
| Publish an announcement | Announcements → Create New |
| Upload AI knowledge | AI Knowledge → Upload |
| Manage resource categories | Resources → Categories |
| Approve an invoice | Payroll Approvals (Super Admin only) |
| Create and assign a task | Task Management (Super Admin only) |

---

Next: [Employee Management](employee-management.md)
