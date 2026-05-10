# Profile Change Requests API

> Audience: Developers

Workflow for employees to request profile data changes that require admin approval. Employees submit change requests specifying old and new values for each field; admins approve or reject them. Approved changes are automatically applied to the `employees` table with rollback on failure.

**Related hooks:** `useProfileChangeRequests`  
**Database tables:** `profile_change_requests`, `employees`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/profile-change-requests` | Any (scoped) | List change requests |
| `POST` | `/api/profile-change-requests` | Any authenticated | Submit a change request |
| `PATCH` | `/api/profile-change-requests/[id]` | admin, super_admin | Approve or reject a request |

---

## GET /api/profile-change-requests

List profile change requests. Admins see all requests; employees see only their own (enforced by RLS).

### Authentication

Any authenticated user. Results are role-scoped via RLS.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `employee_id` | UUID | — | Filter by employee |
| `status` | string | — | Filter by status (`pending`, `approved`, `rejected`) |
| `page` | number | `1` | Page number (1-based) |
| `page_size` | number | `20` | Items per page (max 100) |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "requested_by": "user-uuid",
      "changes": {
        "contact_number": { "old": "+63 912 000 0000", "new": "+63 912 111 1111" },
        "address": { "old": "123 Old St", "new": "456 New Ave" }
      },
      "status": "pending",
      "requested_at": "2026-03-07T10:00:00Z",
      "reviewed_by": null,
      "reviewed_at": null,
      "review_note": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

## POST /api/profile-change-requests

Submit a new profile change request. Non-admin users can only create requests for their own employee record (verified by matching `employee.user_id`).

### Authentication

Any authenticated user. Ownership check for non-admins.

### Request Body

```json
{
  "employee_id": "employee-uuid",
  "changes": {
    "contact_number": { "old": "+63 912 000 0000", "new": "+63 912 111 1111" },
    "address": { "old": "123 Old St", "new": "456 New Ave" }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `employee_id` | Yes | Employee UUID |
| `changes` | Yes | Object mapping field names to `{ old, new }` value pairs |

### Response

Returns `201` with the created change request.

---

## PATCH /api/profile-change-requests/[id]

Approve or reject a profile change request. On approval, changes are automatically applied to the `employees` table.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body

```json
{
  "action": "approve",
  "review_note": "Verified via submitted documents"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `action` | Yes | `approve` or `reject` |
| `review_note` | No | Optional review note |

### Behavior

1. Validates the request exists and has `pending` status
2. Updates status to `approved` or `rejected` with reviewer info
3. **On approve:** Iterates over `changes` and applies each field's `.new` value to the `employees` table
4. **On apply failure:** Rolls back the approval (reverts status to `pending`)

### Response

Returns the updated change request record.

### Error Cases

| Status | Condition |
|--------|-----------|
| `400` | Invalid action or request already processed |
| `404` | Change request not found |
| `500` | Failed to apply changes (auto-rollback) |

---

*Last updated: 2026-03-08*
