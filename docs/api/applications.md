# Applications API

> Audience: Developers

Management of job applications submitted through job postings. Supports listing with search/filter/pagination, viewing individual applications with associated job posting data, and status updates with role-based approval restrictions.

**Related hooks:** `useApplications`, `useApplication`  
**Zod schemas:** `apps/web/src/lib/schemas/job.schema.ts` (`applicationFiltersSchema`, `updateApplicationStatusSchema`)  
**Database tables:** `job_applications`, `job_postings`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/applications` | admin, super_admin | List job applications |
| `GET` | `/api/applications/[id]` | admin, super_admin | Get application detail with job posting |
| `PATCH` | `/api/applications/[id]` | admin, super_admin | Update application status |

---

## GET /api/applications

List job applications with optional search, filter, and pagination.

### Authentication

Requires `admin` or `super_admin` role.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search in applicant name and email |
| `status` | string | — | Filter by application status |
| `jobPostingId` | UUID | — | Filter by job posting |
| `page` | number | `1` | Page number (1-based) |
| `pageSize` | number | `10` | Items per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "job_posting_id": "uuid",
      "full_name": "Juan Dela Cruz",
      "email": "juan@email.com",
      "status": "pending",
      "notes": null,
      "created_at": "2026-03-05T10:00:00Z",
      "job_postings": {
        "id": "uuid",
        "title": "Software Engineer"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

## GET /api/applications/[id]

Get a single application with full job posting details.

### Authentication

Requires `admin` or `super_admin` role.

### Response

```json
{
  "data": {
    "id": "uuid",
    "job_posting_id": "uuid",
    "full_name": "Juan Dela Cruz",
    "email": "juan@email.com",
    "status": "pending",
    "notes": null,
    "reviewed_by": null,
    "reviewed_at": null,
    "created_at": "2026-03-05T10:00:00Z",
    "job_postings": {
      "id": "uuid",
      "title": "Software Engineer",
      "department": "Engineering",
      "location": "Manila, PH",
      "employment_type": "regular"
    }
  }
}
```

Returns `404` if application not found or soft-deleted.

---

## PATCH /api/applications/[id]

Update the status of a job application. Validated with `updateApplicationStatusSchema`.

### Authentication

Requires `admin` or `super_admin` role.

> **Special restriction:** Only `super_admin` can set status to `approved`. Regular admins attempting to approve will receive a `403` error.

### Request Body

```json
{
  "status": "shortlisted",
  "notes": "Strong candidate, schedule interview"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `status` | Yes | New status value |
| `notes` | No | Review notes |

The endpoint automatically sets `reviewed_by` (user ID) and `reviewed_at` (current timestamp).

### Response

Returns the updated application with job posting title.

---

*Last updated: 2026-03-08*
