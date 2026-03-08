# Employees API

> Audience: Developers

CRUD operations for employee records (201 file data). Employee records are linked to `auth.users` via `user_id` and optionally to a manager via `immediate_head`.

**Related hooks:** `useEmployees` (`apps/web/src/hooks/useEmployees.ts`)  
**Related schema:** `EmployeeInsert`, `Employee` from `@hr-portal/database`  
**Database table:** `employees`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/employees` | Any authenticated | List employees with filters |
| `POST` | `/api/employees` | admin, super_admin | Create employee record |
| `GET` | `/api/employees/[id]` | Any (RLS) | Get employee detail |
| `PATCH` | `/api/employees/[id]` | Any (RLS) | Update employee fields |
| `DELETE` | `/api/employees/[id]` | super_admin | Soft-delete employee |

---

## GET /api/employees

List employees with pagination, search, and filters. RLS ensures users only see records they're authorized to view (own record, direct reports for managers, all for admins).

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | `""` | Search by first name, last name, or employee number (case-insensitive) |
| `department` | `string` | — | Filter by department name |
| `status` | `string` | — | Filter by user status (`active`, `on_leave`, `terminated`) |
| `page` | `number` | `1` | Page number (1-based) |
| `pageSize` | `number` | `10` | Results per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "employee_number": "EMP-001",
      "department": "Engineering",
      "position": "Senior Developer",
      "employment_type": "regular",
      "work_arrangement": "full_time",
      "date_hired": "2025-01-15",
      "immediate_head": "uuid | null",
      "created_at": "2025-01-15T00:00:00Z",
      "updated_at": "2026-02-20T10:30:00Z",
      "deleted_at": null,
      "users": {
        "id": "uuid",
        "email": "juan@company.com",
        "role": "employee",
        "status": "active",
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "avatar_url": "https://..."
      },
      "manager": {
        "id": "uuid",
        "email": "manager@company.com",
        "first_name": "Maria",
        "last_name": "Santos"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Example

```bash
# List all employees in Engineering department
curl -X GET "https://your-app.com/api/employees?department=Engineering&page=1&pageSize=20" \
  -H "Cookie: sb-access-token=..."

# Search by name
curl -X GET "https://your-app.com/api/employees?search=Juan" \
  -H "Cookie: sb-access-token=..."
```

### Select Clause

The query uses explicit foreign key relationship names to avoid ambiguity:
- `users!employees_user_id_fkey(*)` — the employee's user account
- `manager:users!employees_immediate_head_fkey(*)` — the employee's manager (aliased as `manager`)

---

## POST /api/employees

Create a new employee record.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body

```json
{
  "user_id": "uuid",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "employee_number": "EMP-042",
  "department": "Engineering",
  "position": "Junior Developer",
  "employment_type": "probationary",
  "work_arrangement": "full_time",
  "date_hired": "2026-02-27",
  "immediate_head": "uuid | null",
  "sss_number": "string | null",
  "philhealth_number": "string | null",
  "pagibig_number": "string | null",
  "tin_number": "string | null"
}
```

> **Security:** Fields like `sss_number`, `philhealth_number`, `pagibig_number`, and `tin_number` contain PII. These are stored but never logged.

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "created_by": "admin-user-uuid",
    "created_at": "2026-02-27T10:00:00Z",
    "updated_at": "2026-02-27T10:00:00Z"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `Unauthorized` | No valid session |
| `403` | `Forbidden` | User is not admin/super_admin |
| `404` | `User not found` | Auth user has no `public.users` record |
| `500` | `Failed to create employee` | Database insert failed |

### Example

```bash
curl -X POST https://your-app.com/api/employees \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "employee_number": "EMP-042",
    "department": "Engineering",
    "position": "Junior Developer",
    "employment_type": "probationary",
    "work_arrangement": "full_time",
    "date_hired": "2026-02-27"
  }'
```

---

## GET /api/employees/[id]

Get a single employee's details including linked user account and manager info.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Employee record ID |

### Response

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "employee_number": "EMP-001",
    "department": "Engineering",
    "position": "Senior Developer",
    "employment_type": "regular",
    "work_arrangement": "full_time",
    "date_hired": "2025-01-15",
    "immediate_head": "uuid",
    "users": { "..." },
    "manager": { "..." }
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `Unauthorized` | No valid session |
| `404` | `Employee not found` | ID doesn't exist or RLS denied access |

### Example

```bash
curl -X GET https://your-app.com/api/employees/550e8400-e29b-41d4-a716-446655440001 \
  -H "Cookie: sb-access-token=..."
```

---

## PATCH /api/employees/[id]

Update employee fields. RLS controls which fields each user can modify — employees can update their own basic info, admins can update all fields.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Employee record ID |

### Request Body

Partial `Employee` — only include fields to update:

```json
{
  "position": "Senior Developer",
  "department": "Engineering",
  "work_arrangement": "full_time"
}
```

### Response

```json
{
  "data": {
    "id": "uuid",
    "position": "Senior Developer",
    "department": "Engineering",
    "work_arrangement": "full_time",
    "updated_at": "2026-02-27T10:30:00Z"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `Unauthorized` | No valid session |
| `404` | `Employee not found` | ID not found or soft-deleted |
| `500` | `Failed to update employee` | Database update failed (RLS denied) |

### Example

```bash
curl -X PATCH https://your-app.com/api/employees/550e8400-e29b-41d4-a716-446655440001 \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{"position": "Senior Developer"}'
```

---

## DELETE /api/employees/[id]

Soft-delete an employee record by setting `deleted_at`.

### Authentication

Requires `super_admin` role.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Employee record ID |

### Response

```json
{
  "success": true
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `Unauthorized` | No valid session |
| `403` | `Forbidden` | User is not super_admin |
| `404` | `User not found` | Auth user has no `public.users` record |
| `500` | `Failed to delete employee` | Database update failed |

### Example

```bash
curl -X DELETE https://your-app.com/api/employees/550e8400-e29b-41d4-a716-446655440001 \
  -H "Cookie: sb-access-token=..."
```

---

## Database Schema

### `employees` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | No | Primary key |
| `user_id` | `uuid` | No | FK → `auth.users(id)` |
| `first_name` | `text` | No | |
| `last_name` | `text` | No | |
| `middle_name` | `text` | Yes | |
| `employee_number` | `text` | Yes | Unique employee identifier |
| `department` | `text` | Yes | Department name |
| `position` | `text` | Yes | Job title |
| `employment_type` | `employment_type` | No | `regular`, `probationary`, `intern`, `project_based` |
| `work_arrangement` | `work_arrangement` | No | `full_time`, `part_time` |
| `date_hired` | `date` | Yes | Employment start date |
| `immediate_head` | `uuid` | Yes | FK → `auth.users(id)` (manager) |
| `sss_number` | `text` | Yes | ⚠️ PII |
| `philhealth_number` | `text` | Yes | ⚠️ PII |
| `pagibig_number` | `text` | Yes | ⚠️ PII |
| `tin_number` | `text` | Yes | ⚠️ PII |
| `created_at` | `timestamptz` | No | |
| `updated_at` | `timestamptz` | No | |
| `created_by` | `uuid` | Yes | FK → `auth.users(id)` |
| `deleted_at` | `timestamptz` | Yes | Soft delete timestamp |

### RLS Policies

- Employees can SELECT their own record
- Managers can SELECT their direct reports
- Admins can SELECT/INSERT/UPDATE all records
- Super admins can soft-delete (UPDATE `deleted_at`)

---

*Last updated: 2026-02-27*
