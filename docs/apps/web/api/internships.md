# Internships API

> Audience: Developers

Internship lifecycle management — create, track, log daily hours, extend, and complete internships. Includes supervisor oversight and progress tracking.

**Related hooks:** `useInternships`, `useInternship`, `useInternshipLogs`  
**Zod schema:** `apps/web/src/lib/schemas/internship.schema.ts`  
**Database tables:** `internships`, `internship_daily_logs`, `employees`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/internships` | Any | List internships (enriched) |
| `POST` | `/api/internships` | Admin | Create internship |
| `GET` | `/api/internships/[id]` | Admin/Supervisor/Self | Get internship detail |
| `PATCH` | `/api/internships/[id]` | Admin/Supervisor | Update internship |
| `DELETE` | `/api/internships/[id]` | Admin | Soft-delete internship |
| `POST` | `/api/internships/initialize` | Associate | Self-initialize internship |
| `PATCH` | `/api/internships/[id]/extend` | Admin | Extend internship |
| `GET` | `/api/internships/[id]/logs` | Admin/Supervisor/Self | List daily logs |
| `POST` | `/api/internships/[id]/logs` | Any | Create daily log |
| `PATCH` | `/api/internships/[id]/logs` | Admin/Supervisor | Approve daily log |

---

## GET /api/internships

List internships with enriched data. Any authenticated user can list, but returned data is comprehensive only for admins.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `string` | — | Filter: `active`, `completed`, `terminated`, `converted` |
| `supervisorId` | `uuid` | — | Filter by supervisor |
| `search` | `string` | — | Search associate's first/last name |
| `sortBy` | `string` | `start_date` | Sort column |
| `sortOrder` | `asc\|desc` | `desc` | |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `20` | |

### Enriched Response

Each internship record includes:

- **Employee**: `first_name`, `last_name`, `avatar_url` (joined from `employees`)
- **Supervisor**: `first_name`, `last_name` (joined from `employees` via `supervisor_id`)
- **Daily logs**: All `internship_daily_logs` entries
- **Weekly stats**: Hours grouped by ISO week
- **Progress %**: `(completed_hours / required_hours) * 100`

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "supervisor_id": "uuid",
      "start_date": "2026-01-15",
      "end_date": "2026-07-15",
      "status": "active",
      "required_hours": 500,
      "completed_hours": 240,
      "department": "Engineering",
      "position": "Software Engineering Associate",
      "intern_name": "Ana Reyes",
      "intern_avatar": "https://...",
      "supervisor_name": "Maria Santos",
      "daily_logs": [ /* ... */ ],
      "weekly_stats": [
        { "week": "2026-W04", "hours": 35 }
      ],
      "progress": 48
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 3, "totalPages": 1 }
}
```

---

## POST /api/internships (Admin)

Create an internship record for an employee.

```json
{
  "employeeId": "uuid",
  "supervisorId": "uuid",
  "startDate": "2026-01-15",
  "endDate": "2026-07-15",
  "requiredHours": 500,
  "department": "Engineering",
  "position": "Software Engineering Associate"
}
```

**201 Created**

---

## POST /api/internships/initialize (Associate Only)

Self-service internship initialization. The associate's employee record is resolved from their auth user.

### Rules

- Only users with `associate` role can call this endpoint
- Prevents duplicates: if an `active` internship exists → **409 Conflict**
- Action is audit-logged

```json
{
  "startDate": "2026-01-15",
  "endDate": "2026-07-15",
  "requiredHours": 500,
  "department": "Engineering",
  "position": "Software Engineering Associate"
}
```

---

## GET /api/internships/[id]

Get detailed internship with daily logs aggregated into weekly hours, plus supervisor info.

### Access Control

- **Admins**: full access
- **Supervisors**: can view internships they supervise
- **Interns**: can view their own

---

## PATCH /api/internships/[id]

Update internship fields. Restricted to admin or the assigned supervisor.

```json
{
  "status": "completed",
  "completedHours": 500,
  "endDate": "2026-07-15"
}
```

---

## PATCH /api/internships/[id]/extend (Admin)

Extend an active internship's end date.

### Rules

- Internship must be in `active` status
- Reason is required (minimum 5 characters)
- Action is audit-logged

```json
{
  "newEndDate": "2026-09-15",
  "reason": "Associate requested extension to complete capstone project"
}
```

---

## Daily Logs

### GET /api/internships/[id]/logs

List daily log entries for an internship.

**Query:** `?page=1&pageSize=20`

```json
{
  "data": [
    {
      "id": "uuid",
      "internship_id": "uuid",
      "log_date": "2026-02-15",
      "hours_worked": 8,
      "tasks_completed": "Implemented login page, fixed navigation bug",
      "challenges": "CORS issues with API",
      "learnings": "Learned about proxy configuration",
      "is_approved": false,
      "supervisor_notes": null,
      "created_at": "2026-02-15T17:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 30, "totalPages": 2 }
}
```

### POST /api/internships/[id]/logs

Create a daily log entry. Automatically increments `internships.completed_hours`.

```json
{
  "logDate": "2026-02-15",
  "hoursWorked": 8,
  "tasksCompleted": "Implemented login page",
  "challenges": "CORS issues",
  "learnings": "Proxy configuration"
}
```

**Duplicate Prevention:** If a log already exists for the same date, returns **409 Conflict** (PostgreSQL error code 23505).

### PATCH /api/internships/[id]/logs (Supervisor/Admin)

Approve a daily log.

```json
{
  "logId": "uuid",
  "isApproved": true,
  "supervisorNotes": "Good work on the login page"
}
```

---

## DELETE /api/internships/[id] (Admin)

Soft-delete an internship record by setting `deleted_at`.

### Authentication

Requires `admin` or `super_admin` role.

### Response

```json
{ "success": true }
```

---

## Internship Status Values

| Status | Description |
|--------|-------------|
| `active` | Currently ongoing |
| `completed` | Successfully finished required hours |
| `terminated` | Ended early |
| `converted` | Associate converted to regular employee |

---

*Last updated: 2026-03-08*
