# Departments API

> Audience: Developers

Department management for the organizational structure. Departments are referenced by employees and used for filtering across the application.

**Related hooks:** `useDepartments` (`apps/web/src/hooks/useDepartments.ts`)  
**Related schema:** `DepartmentInsert` from `@hr-portal/database`  
**Database table:** `departments`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/departments` | Any authenticated | List departments |
| `POST` | `/api/departments` | admin, super_admin | Create department |
| `GET` | `/api/departments/leads` | Any authenticated | List active lead appointments |
| `POST` | `/api/departments/leads` | super_admin | Appoint a directory account to a department |
| `DELETE` | `/api/departments/leads` | super_admin | Revoke one department/user appointment |

---

## GET /api/departments

List all departments with optional search and pagination. Results ordered alphabetically by name.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | `""` | Filter by department name (case-insensitive `ILIKE`) |
| `page` | `number` | `1` | Page number (1-based) |
| `pageSize` | `number` | `50` | Results per page (default higher than other endpoints) |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Engineering",
      "description": "Software development and infrastructure",
      "head_id": "uuid | null",
      "created_at": "2025-01-15T00:00:00Z",
      "updated_at": "2026-02-20T10:00:00Z",
      "created_by": "uuid",
      "deleted_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 6,
    "totalPages": 1
  }
}
```

> **Note:** `head_id` references `auth.users(id)`, not `public.users(id)`. The client must resolve the department head's name separately if needed.

### Example

```bash
# List all departments
curl -X GET "https://your-app.com/api/departments" \
  -H "Cookie: sb-access-token=..."

# Search by name
curl -X GET "https://your-app.com/api/departments?search=eng" \
  -H "Cookie: sb-access-token=..."
```

---

## POST /api/departments

Create a new department.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body

```json
{
  "name": "Marketing",
  "description": "Brand management and communications",
  "head_id": "uuid | null"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Department name (unique) |
| `description` | `string` | No | Department description |
| `head_id` | `uuid` | No | FK → `auth.users(id)` department head |

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "name": "Marketing",
    "description": "Brand management and communications",
    "head_id": null,
    "created_by": "admin-user-uuid",
    "created_at": "2026-02-27T10:00:00Z",
    "updated_at": "2026-02-27T10:00:00Z"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Department name is required` | Missing `name` field |
| `401` | `Unauthorized` | No valid session |
| `403` | `Forbidden` | User is not admin/super_admin |
| `404` | `User not found` | Auth user has no `public.users` record |
| `409` | `Department name already exists` | Unique constraint violation (PostgreSQL error `23505`) |
| `500` | `Failed to create department` | Database insert failed |

### Example

```bash
curl -X POST https://your-app.com/api/departments \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing",
    "description": "Brand management and communications"
  }'
```

---

## Department lead appointments

`POST` and `DELETE /api/departments/leads` accept:

```json
{
  "departmentId": "uuid",
  "userId": "uuid"
}
```

- Super-admins can search by name, email, or position across the whole directory,
  including directory-visible admins and leadership. The picker uses paginated
  server search, not a department-filtered roster.
- Appointment eligibility follows the directory population: workforce accounts
  that are not deleted or terminated. Privileged non-workforce and reviewer-only
  identities are not offered. The destination department must exist and not be deleted.
- Once appointed, a lead's authority comes from the active appointment regardless of
  account kind; only deletion, termination, or revoking the appointment removes it.
- One person can hold active appointments in multiple departments, with multiple
  co-leads per department. Appointing a lead never changes their home department.
- Authority follows non-revoked appointments rather than home-department membership.
  Leads can manage eligible members of every department they lead. Project membership
  for someone outside those departments requires an accepted individual invitation,
  including for administrators; the separate project-department and task-assignment
  checks remain in place. Existing global admin project visibility is unchanged.
- Revoking an appointment removes only that department's lead authority. Other
  appointments and independent project ownership remain intact.
- Appointments and removals are server-confirmed, audited operations. Duplicate
  active appointments return `200`; new appointments return `201`. Invalid inputs
  or ineligible candidates return `400`, missing departments return `404`, and
  validation/storage failures return `500`.

## Database Schema

### `departments` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | No | Primary key |
| `name` | `text` | No | Department name (unique) |
| `description` | `text` | Yes | Department description |
| `head_id` | `uuid` | Yes | FK → `auth.users(id)` |
| `created_at` | `timestamptz` | No | |
| `updated_at` | `timestamptz` | No | |
| `created_by` | `uuid` | Yes | FK → `auth.users(id)` |
| `deleted_at` | `timestamptz` | Yes | Soft delete |

### RLS Policies

- All authenticated users can SELECT departments
- Admins and super admins can INSERT new departments

---

*Last updated: 2026-11-04*
