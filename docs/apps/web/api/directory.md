# Directory API

> Audience: Developers

Employee directory listing, detail view, and CSV export. Uses the `employee_directory` database view which joins users, employees, departments, and active internships.

**Related hooks:** `useDirectory`, `useDirectoryUser`  
**Database views:** `employee_directory`  
**Database tables:** `users`, `employees`, `departments`, `internships`, `profile_change_requests`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/directory` | admin, super_admin | List employees with search, filter, sort, pagination |
| `GET` | `/api/directory/export` | admin, super_admin | Export directory as CSV or JSON |
| `GET` | `/api/directory/[userId]` | admin, super_admin | Get full employee detail by user ID |

---

## GET /api/directory

List employees from the `employee_directory` view with full search, filtering, sorting, and pagination support.

### Authentication

Requires `admin` or `super_admin` role.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Case-insensitive search across name, email, position |
| `role` | string | — | Filter by role (e.g. `employee`, `associate`) |
| `department` | string | — | Filter by department name |
| `status` | string | — | Comma-separated statuses (e.g. `active,on_leave,probation`) |
| `employment_type` | string | — | Filter by employment type |
| `sort_by` | string | `full_name` | Sort column: `full_name`, `department_name`, `start_date`, `status`, `role`, `position` |
| `sort_order` | string | `asc` | `asc` or `desc` |
| `page` | number | `1` | Page number (1-based) |
| `page_size` | number | `20` | Items per page (max 100) |

### Response

```json
{
  "data": [
    {
      "user_id": "uuid",
      "full_name": "Juan Dela Cruz",
      "email": "juan@company.com",
      "role": "employee",
      "department_name": "Engineering",
      "position": "Software Engineer",
      "status": "active",
      "employment_type": "regular",
      "start_date": "2025-06-01",
      "contact_number": "+63 912 345 6789",
      "internship_status": null
    }
  ],
  "metadata": {
    "total": 42,
    "active": 38,
    "associates": 5,
    "onLeave": 2,
    "probation": 3
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

The `metadata` object provides aggregate counts across the entire directory (not just the current page), useful for dashboard stat cards.

---

## GET /api/directory/export

Export the employee directory as CSV or JSON. Supports the same filters as the listing endpoint.

### Authentication

Requires `admin` or `super_admin` role.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `csv` | Export format: `csv` or `json` |
| `role` | string | — | Filter by role |
| `department` | string | — | Filter by department |
| `status` | string | — | Filter by status |

### CSV Response

Returns a downloadable CSV file with headers:
- Full Name, Role, Department, Position, Status, Employment Type, Start Date, Email, Contact Number

Content-Type: `text/csv`  
Content-Disposition: `attachment; filename="employee-directory-2026-03-08.csv"`

### JSON Response

Same fields wrapped in `{ "data": [...] }`.

---

## GET /api/directory/[userId]

Get full employee detail from the directory view, combined with auth user metadata (avatar) and profile change request history.

### Authentication

Requires `admin` or `super_admin` role.

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | UUID | The user's auth ID |

### Response

```json
{
  "data": {
    "user_id": "uuid",
    "employee_id": "uuid",
    "full_name": "Juan Dela Cruz",
    "email": "juan@company.com",
    "role": "employee",
    "department_name": "Engineering",
    "position": "Software Engineer",
    "status": "active",
    "employment_type": "regular",
    "start_date": "2025-06-01",
    "avatar_url": "https://storage.example.com/avatars/uuid/avatar.jpg",
    "pending_change_requests": [
      {
        "id": "uuid",
        "changes": {
          "contact_number": { "old": "+63 912 000 0000", "new": "+63 912 111 1111" }
        },
        "requested_at": "2026-03-07T10:00:00Z",
        "status": "pending"
      }
    ]
  }
}
```

Returns `404` if no directory entry exists for the given user ID.

---

*Last updated: 2026-03-08*
