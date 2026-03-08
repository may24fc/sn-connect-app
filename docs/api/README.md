# API Reference — Index

> Audience: Developers

All API routes live under `apps/web/src/app/api/`. Every endpoint requires authentication via Supabase session cookie unless noted otherwise. Row Level Security (RLS) is the final gatekeeper — application-level checks are secondary.

**Total: 183 HTTP method handlers across 25 domains.**

---

## Quick Reference

| Domain | Endpoints | Base Path | Doc |
|--------|-----------|-----------|-----|
| [Auth](#auth) | 2 | `/api/auth/` | [auth.md](auth.md) |
| [Employees](#employees) | 5 | `/api/employees/` | [employees.md](employees.md) |
| [Documents](#documents) | 4 | `/api/documents/` | [documents.md](documents.md) |
| [Departments](#departments) | 2 | `/api/departments/` | [departments.md](departments.md) |
| [Onboarding](#onboarding) | 16 | `/api/onboarding/` | [onboarding.md](onboarding.md) |
| [Users](#users) | 9 | `/api/users/` | [users.md](users.md) |
| [Tasks](#tasks) | 8 | `/api/tasks/` | [tasks.md](tasks.md) |
| [Reports](#reports) | 7 | `/api/reports/` | [reports.md](reports.md) |
| [Invoices](#invoices) | 6 | `/api/invoices/` | [invoices.md](invoices.md) |
| [Announcements](#announcements) | 18 | `/api/announcements/` | [announcements.md](announcements.md) |
| [Resources](#resources) | 26 | `/api/resources/` | [resources.md](resources.md) |
| [Collections](#collections) | 8 | `/api/collections/` | [collections.md](collections.md) |
| [Performance](#performance) | 18 | `/api/performance/` | [performance.md](performance.md) |
| [Probation](#probation) | 3 | `/api/probation/` | [probation.md](probation.md) |
| [Internships](#internships) | 10 | `/api/internships/` | [internships.md](internships.md) |
| [Standups](#standups) | 6 | `/api/standups/` | [standups.md](standups.md) |
| [AI](#ai) | 9 | `/api/ai/` | [ai.md](ai.md) |
| [Notifications](#notifications) | 4 | `/api/notifications/` | [notifications.md](notifications.md) |
| [Dashboard](#dashboard) | 3 | `/api/dashboard/` | [dashboard.md](dashboard.md) |
| [Directory](#directory) | 3 | `/api/directory/` | [directory.md](directory.md) |
| [Jobs](#jobs) | 5 | `/api/jobs/` | [jobs.md](jobs.md) |
| [Applications](#applications) | 3 | `/api/applications/` | [applications.md](applications.md) |
| [Profile](#profile) | 3 | `/api/profile/` | [profile.md](profile.md) |
| [Profile Change Requests](#profile-change-requests) | 3 | `/api/profile-change-requests/` | [profile-change-requests.md](profile-change-requests.md) |
| [Banks](#banks) | 1 | `/api/banks/` | [banks.md](banks.md) |

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/callback` | None | OAuth PKCE code exchange and redirect |
| `POST` | `/api/auth/signout` | Session | Signs out the current user |

→ [Full reference](auth.md)

---

## Employees

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/employees` | Any authenticated | List employees with search, filters, pagination |
| `POST` | `/api/employees` | admin, super_admin | Create a new employee record |
| `GET` | `/api/employees/[id]` | Any (RLS) | Get employee details with user and manager info |
| `PATCH` | `/api/employees/[id]` | Any (RLS) | Update employee fields |
| `DELETE` | `/api/employees/[id]` | super_admin | Soft-delete an employee record |

→ [Full reference](employees.md)

---

## Documents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/documents` | Any (RLS) | List documents with type/confidential filters |
| `POST` | `/api/documents` | Any authenticated | Create document metadata record |
| `POST` | `/api/documents/upload` | Any (RLS) | Upload file to storage + create DB record |
| `GET` | `/api/documents/[id]/download` | Any (RLS) | Generate 60-second signed download URL |

→ [Full reference](documents.md)

---

## Departments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/departments` | Any authenticated | List departments with search and pagination |
| `POST` | `/api/departments` | admin, super_admin | Create a new department |

→ [Full reference](departments.md)

---

## Onboarding

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/onboarding` | Any authenticated | Fetch onboarding checklists |
| `POST` | `/api/onboarding` | admin, super_admin | Create checklist with tasks |
| `GET` | `/api/onboarding/profile` | Any authenticated | Get current user's onboarding profile |
| `POST` | `/api/onboarding/profile` | Any authenticated | Create onboarding profile (idempotent) |
| `PATCH` | `/api/onboarding/profile/step` | Any authenticated | Update wizard step data (personal/payment) |
| `POST` | `/api/onboarding/profile/complete` | Any authenticated | Mark onboarding complete → awaiting_approval |
| `GET` | `/api/onboarding/documents` | Any authenticated | List user's onboarding documents |
| `POST` | `/api/onboarding/documents` | Any authenticated | Upload onboarding document |
| `DELETE` | `/api/onboarding/documents/[id]` | Owner or admin | Soft-delete onboarding document |
| `GET` | `/api/onboarding/documents/[id]/preview` | Owner or admin | 10-minute signed preview URL |
| `GET` | `/api/onboarding/profiles` | admin, super_admin | List all onboarding profiles (admin) |
| `GET` | `/api/onboarding/profiles/[id]` | admin, super_admin | Get onboarding profile detail (admin) |
| `GET` | `/api/onboarding/profiles/[id]/documents` | admin, super_admin | List profile's documents (admin) |
| `GET` | `/api/onboarding/[id]/tasks` | Owner or admin | List checklist tasks |
| `POST` | `/api/onboarding/[id]/tasks` | admin, super_admin | Create checklist task |
| `PATCH` | `/api/onboarding/[id]/tasks` | Owner or admin | Toggle task completion |

→ [Full reference](onboarding.md)

---

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/users/invite` | admin, super_admin | Invite user with email, role, temp password |
| `POST` | `/api/users/approve-onboarding` | admin, super_admin | Approve or reject onboarding |
| `POST` | `/api/users/assign-employee` | admin, super_admin | Assign probation details to employee |
| `POST` | `/api/users/assign-intern` | admin, super_admin | Assign internship details + create record |
| `GET` | `/api/users/[id]/kpi-entries` | admin, super_admin | List KPI entries for user |
| `POST` | `/api/users/[id]/kpi-entries` | admin, super_admin | Create KPI entry for user |
| `GET` | `/api/users/[id]/metadata` | Any authenticated | Get user role metadata |
| `PUT` | `/api/users/[id]/metadata` | admin, super_admin | Update user role metadata |
| `DELETE` | `/api/users/[id]/metadata` | admin, super_admin | Delete user role metadata |

→ [Full reference](users.md)

---

## Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tasks` | Any authenticated | List tasks with filters and pagination |
| `POST` | `/api/tasks` | super_admin | Create and assign a task |
| `GET` | `/api/tasks/[id]` | Any authenticated | Get task detail with names |
| `PATCH` | `/api/tasks/[id]` | Any (reassign: super_admin) | Update task fields |
| `DELETE` | `/api/tasks/[id]` | Any authenticated | Soft-delete a task |
| `GET` | `/api/tasks/assignees` | super_admin | List eligible assignees |
| `GET` | `/api/tasks/[id]/comments` | Any authenticated | List task comments |
| `POST` | `/api/tasks/[id]/comments` | Any authenticated | Create a comment on a task |

→ [Full reference](tasks.md)

---

## Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/reports` | Any (scoped) | List reports; non-admins see own only |
| `POST` | `/api/reports` | Any authenticated | Create report with metrics |
| `GET` | `/api/reports/[id]` | Any (RLS) | Get report detail with metrics |
| `PATCH` | `/api/reports/[id]` | Any (RLS) | Update report and replace metrics |
| `DELETE` | `/api/reports/[id]` | Any (RLS) | Soft-delete a report |
| `POST` | `/api/reports/[id]/submit` | Any authenticated | Submit report for review |
| `POST` | `/api/reports/[id]/approve` | admin, super_admin | Approve or reject a report |

→ [Full reference](reports.md)

---

## Invoices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/invoices` | Any (scoped) | List invoices; non-admins see own only |
| `POST` | `/api/invoices` | Any authenticated | Create invoice with line items |
| `GET` | `/api/invoices/[id]` | Any (RLS) | Get invoice detail with line items |
| `PATCH` | `/api/invoices/[id]` | Any (RLS) | Update invoice and replace line items |
| `POST` | `/api/invoices/[id]/submit` | Any authenticated | Submit invoice for approval |
| `POST` | `/api/invoices/[id]/approve` | admin, super_admin | Approve or reject an invoice |

→ [Full reference](invoices.md)

---

## Announcements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/announcements` | admin, super_admin | List all announcements (admin view) |
| `POST` | `/api/announcements` | admin, super_admin | Create an announcement |
| `GET` | `/api/announcements/feed` | Any authenticated | Published announcement feed with read status |
| `GET` | `/api/announcements/[id]` | admin, super_admin | Get announcement detail (admin) |
| `PATCH` | `/api/announcements/[id]` | admin, super_admin | Update announcement fields |
| `DELETE` | `/api/announcements/[id]` | admin, super_admin | Soft-delete an announcement |
| `POST` | `/api/announcements/[id]/publish` | admin, super_admin | Publish an announcement |
| `POST` | `/api/announcements/[id]/read` | Any authenticated | Mark announcement as read |
| `POST` | `/api/announcements/[id]/pin` | admin, super_admin | Pin an announcement |
| `DELETE` | `/api/announcements/[id]/pin` | admin, super_admin | Unpin an announcement |
| `POST` | `/api/announcements/[id]/archive` | admin, super_admin | Archive an announcement |
| `GET` | `/api/announcements/[id]/analytics` | admin, super_admin | Read analytics (count, readers, time series) |
| `POST` | `/api/announcements/[id]/remind` | admin, super_admin | Send reminder notification to unread users |
| `GET` | `/api/announcements/[id]/comments` | Any authenticated | List announcement comments |
| `POST` | `/api/announcements/[id]/comments` | Any authenticated | Comment on an announcement |
| `GET` | `/api/announcements/[id]/attachments` | Any authenticated | List announcement attachments |
| `POST` | `/api/announcements/[id]/attachments` | admin, super_admin | Upload attachment |
| `DELETE` | `/api/announcements/[id]/attachments/[attachmentId]` | admin, super_admin | Delete attachment |

→ [Full reference](announcements.md)

---

## Resources

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/resources` | admin, super_admin | List all resources (admin, includes drafts) |
| `POST` | `/api/resources` | admin, super_admin | Create a resource (defaults to draft) |
| `GET` | `/api/resources/feed` | Any authenticated | Published resource feed |
| `GET` | `/api/resources/search` | Any authenticated | Full-text search published resources |
| `GET` | `/api/resources/featured` | Any authenticated | Up to 10 featured resources |
| `GET` | `/api/resources/recent` | Any authenticated | User's recently viewed resources |
| `GET` | `/api/resources/bookmarks` | Any authenticated | User's bookmarked resources |
| `POST` | `/api/resources/upload` | admin, super_admin | Upload resource file (up to 100MB) |
| `POST` | `/api/resources/bulk-upload` | admin, super_admin | Bulk upload with shared metadata |
| `GET` | `/api/resources/categories` | Any authenticated | List resource categories (tree) |
| `POST` | `/api/resources/categories` | admin, super_admin | Create a resource category |
| `PATCH` | `/api/resources/categories` | admin, super_admin | Update a resource category |
| `DELETE` | `/api/resources/categories` | admin, super_admin | Delete a resource category |
| `GET` | `/api/resources/[id]` | Any authenticated | Get resource detail |
| `PATCH` | `/api/resources/[id]` | admin, super_admin | Update resource fields |
| `DELETE` | `/api/resources/[id]` | admin, super_admin | Soft-delete a resource |
| `POST` | `/api/resources/[id]/publish` | admin, super_admin | Publish a resource |
| `POST` | `/api/resources/[id]/archive` | admin, super_admin | Archive a resource |
| `POST` | `/api/resources/[id]/featured` | admin, super_admin | Mark as featured |
| `DELETE` | `/api/resources/[id]/featured` | admin, super_admin | Remove featured status |
| `POST` | `/api/resources/[id]/bookmark` | Any authenticated | Bookmark a resource |
| `DELETE` | `/api/resources/[id]/bookmark` | Any authenticated | Remove bookmark |
| `POST` | `/api/resources/[id]/view` | Any authenticated | Track resource view |
| `GET` | `/api/resources/[id]/analytics` | admin, super_admin | View analytics (counts, time series) |
| `GET` | `/api/resources/[id]/download` | Any authenticated | 15-minute signed download URL |
| `GET` | `/api/resources/[id]/stream` | Any authenticated | Stream resource file content |

→ [Full reference](resources.md)

---

## Collections

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/collections` | Any authenticated | List collections with pagination |
| `POST` | `/api/collections` | admin, super_admin | Create a collection |
| `GET` | `/api/collections/[id]` | Any authenticated | Get collection detail |
| `PATCH` | `/api/collections/[id]` | admin, super_admin | Update collection fields |
| `DELETE` | `/api/collections/[id]` | admin, super_admin | Soft-delete a collection |
| `GET` | `/api/collections/[id]/resources` | Any authenticated | List resources in collection (ordered) |
| `POST` | `/api/collections/[id]/resources` | admin, super_admin | Add resource to collection |
| `DELETE` | `/api/collections/[id]/resources` | admin, super_admin | Remove resource from collection |

→ [Full reference](collections.md)

---

## Performance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/performance/cycles` | Any authenticated | List review cycles |
| `POST` | `/api/performance/cycles` | admin, super_admin | Create a review cycle |
| `PATCH` | `/api/performance/cycles` | admin, super_admin | Update a review cycle |
| `DELETE` | `/api/performance/cycles` | admin, super_admin | Delete a review cycle |
| `GET` | `/api/performance/kpis` | Any (scoped) | List KPIs; non-admins see own only |
| `POST` | `/api/performance/kpis` | Any authenticated | Create a KPI |
| `PATCH` | `/api/performance/kpis` | Any authenticated | Update KPI value/status |
| `GET` | `/api/performance/okrs` | Any (scoped) | List OKRs; non-admins see own only |
| `POST` | `/api/performance/okrs` | Any authenticated | Create an OKR |
| `PATCH` | `/api/performance/okrs` | Any authenticated | Update OKR progress/status |
| `GET` | `/api/performance/okr-targets` | Any (scoped) | List OKR targets |
| `POST` | `/api/performance/okr-targets` | Any authenticated | Create an OKR target |
| `PATCH` | `/api/performance/okr-targets` | Any authenticated | Update OKR target progress |
| `DELETE` | `/api/performance/okr-targets` | Any authenticated | Delete an OKR target |
| `GET` | `/api/performance/reviews` | Any (scoped) | List performance reviews |
| `POST` | `/api/performance/reviews` | Any authenticated | Create a performance review |
| `PATCH` | `/api/performance/reviews` | Any authenticated | Update review ratings/status |
| `GET` | `/api/performance/individual/[employeeId]` | Any (scoped) | Get individual performance summary |

→ [Full reference](performance.md)

---

## Probation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/probation` | admin, super_admin | List probation employees with details |
| `POST` | `/api/probation` | admin, super_admin | Extend or complete probation |
| `GET` | `/api/probation/me` | Any authenticated | Get own probation status |

→ [Full reference](probation.md)

---

## Internships

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/internships` | Any (scoped) | List internships with filters |
| `POST` | `/api/internships` | admin, super_admin | Create an internship record |
| `POST` | `/api/internships/initialize` | intern | Self-initialize internship |
| `GET` | `/api/internships/[id]` | Owner, supervisor, admin | Get internship detail with logs |
| `PATCH` | `/api/internships/[id]` | Admin or supervisor | Update internship fields |
| `DELETE` | `/api/internships/[id]` | admin, super_admin | Soft-delete an internship record |
| `PATCH` | `/api/internships/[id]/extend` | admin, super_admin | Extend internship end date |
| `GET` | `/api/internships/[id]/logs` | Owner, supervisor, admin | List daily logs |
| `POST` | `/api/internships/[id]/logs` | Intern (self) or admin | Create daily log entry |
| `PATCH` | `/api/internships/[id]/logs` | Admin or supervisor | Approve/review daily log |

→ [Full reference](internships.md)

---

## Standups

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/standups` | Any authenticated | List standup recordings |
| `POST` | `/api/standups` | admin, super_admin | Create standup record + trigger transcription |
| `POST` | `/api/standups/upload` | admin, super_admin | Upload recording file (up to 500MB) |
| `GET` | `/api/standups/[id]` | Any authenticated | Get standup detail with topics |
| `PATCH` | `/api/standups/[id]` | admin, super_admin | Update standup fields |
| `DELETE` | `/api/standups/[id]` | admin, super_admin | Soft-delete standup recording |

→ [Full reference](standups.md)

---

## AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai/chat` | Any authenticated | Send message to Claude with RAG context |
| `GET` | `/api/ai/sources` | admin, super_admin | List knowledge sources (admin) |
| `POST` | `/api/ai/sources` | admin, super_admin | Create knowledge source + audit log |
| `GET` | `/api/ai/sources/[id]` | admin, super_admin | Get source with embedding count |
| `PATCH` | `/api/ai/sources/[id]` | admin, super_admin | Update source, clear stale embeddings |
| `DELETE` | `/api/ai/sources/[id]` | admin, super_admin | Soft-delete source + cleanup embeddings |
| `POST` | `/api/ai/sources/upload` | admin, super_admin | Upload knowledge file (PDF/DOC/TXT/MD, 10MB) |
| `GET` | `/api/ai/sources/[id]/versions` | admin, super_admin | List source version history |
| `POST` | `/api/ai/sources/[id]/versions` | admin, super_admin | Restore a specific source version |

→ [Full reference](ai.md)

---

## Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard/stats` | Any authenticated | Role-aware dashboard statistics |
| `GET` | `/api/dashboard/super-admin-stats` | super_admin | Super-admin aggregate stats |
| `GET` | `/api/dashboard/pending` | admin, super_admin | Pending approvals count |

→ [Full reference](dashboard.md)

---

## Directory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/directory` | admin, super_admin | List employees for directory |
| `GET` | `/api/directory/export` | admin, super_admin | CSV export of directory |
| `GET` | `/api/directory/[userId]` | admin, super_admin | Get employee detail by user ID |

→ [Full reference](directory.md)

---

## Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/jobs` | Any authenticated | List job postings |
| `POST` | `/api/jobs` | admin, super_admin | Create a job posting |
| `GET` | `/api/jobs/[id]` | Any authenticated | Get job detail |
| `PATCH` | `/api/jobs/[id]` | admin, super_admin | Update a job posting |
| `DELETE` | `/api/jobs/[id]` | admin, super_admin | Delete a job posting |

→ [Full reference](jobs.md)

---

## Applications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/applications` | admin, super_admin | List job applications |
| `GET` | `/api/applications/[id]` | admin, super_admin | Get application detail |
| `PATCH` | `/api/applications/[id]` | admin, super_admin | Update application status |

→ [Full reference](applications.md)

---

## Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/profile/avatar` | Any authenticated | Upload profile avatar |
| `DELETE` | `/api/profile/avatar` | Any authenticated | Remove profile avatar |
| `PATCH` | `/api/profile/info` | Any authenticated | Update own profile information |

→ [Full reference](profile.md)

---

## Profile Change Requests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/profile-change-requests` | Any (scoped) | List profile change requests |
| `POST` | `/api/profile-change-requests` | Any authenticated | Submit profile change request |
| `PATCH` | `/api/profile-change-requests/[id]` | admin, super_admin | Approve or reject request |

→ [Full reference](profile-change-requests.md)

---

## Banks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/banks` | Any authenticated | List available banks |

→ [Full reference](banks.md)

---

## Common Patterns

### Authentication

All endpoints (except auth callbacks and webhooks) use Supabase session cookies. The server creates a Supabase client per request using the cookie, which enforces RLS automatically.

```typescript
import { createServerClient } from '@/lib/supabase/server';

const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
```

Admin endpoints additionally check the user's role from `public.users`:

```typescript
const { data: userData } = await supabase
  .from('users')
  .select('role')
  .eq('auth_id', user.id)
  .single();

const isAdmin = ['admin', 'super_admin'].includes(userData.role);
```

### Error Response Format

All endpoints return errors in a consistent shape:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details (development mode only)"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — validation failed |
| `401` | Unauthorized — no valid session |
| `403` | Forbidden — insufficient role |
| `404` | Not found |
| `500` | Internal server error |

### Pagination

List endpoints accept `page` (1-based) and `pageSize` (default 10, max 100) query params and return:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Soft Delete

All delete operations set `deleted_at` rather than removing rows. Soft-deleted records are excluded from all queries by default.

---

*Last updated: 2026-03-08*
