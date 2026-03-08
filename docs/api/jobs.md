# Jobs API

> Audience: Developers

CRUD operations for job postings. Supports searching, filtering by employment type and active status, and pagination. Uses Zod validation for all create/update operations.

**Related hooks:** `useJobPostings`, `useJobPosting`  
**Zod schemas:** `apps/web/src/lib/schemas/job.schema.ts` (`createJobPostingSchema`, `updateJobPostingSchema`, `jobPostingFiltersSchema`)  
**Database tables:** `job_postings`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/jobs` | admin, super_admin | List job postings with filters |
| `POST` | `/api/jobs` | admin, super_admin | Create a new job posting |
| `GET` | `/api/jobs/[id]` | admin, super_admin | Get job posting detail |
| `PATCH` | `/api/jobs/[id]` | admin, super_admin | Update a job posting |
| `DELETE` | `/api/jobs/[id]` | admin, super_admin | Soft-delete a job posting |

---

## GET /api/jobs

List job postings with optional search, filter, and pagination.

### Authentication

Requires `admin` or `super_admin` role.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search in title and description |
| `employmentType` | string | — | Filter by employment type |
| `isActive` | boolean | — | Filter by active status |
| `page` | number | `1` | Page number (1-based) |
| `pageSize` | number | `10` | Items per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Software Engineer",
      "department": "Engineering",
      "location": "Manila, PH",
      "employment_type": "regular",
      "description": "...",
      "requirements": "...",
      "benefits": "...",
      "salary_range": "₱50,000 - ₱80,000",
      "is_active": true,
      "closes_at": "2026-04-01T00:00:00Z",
      "published_at": "2026-03-01T00:00:00Z",
      "created_by": "user-uuid",
      "created_at": "2026-03-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## POST /api/jobs

Create a new job posting. Validated with `createJobPostingSchema`.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body

```json
{
  "title": "Software Engineer",
  "department": "Engineering",
  "location": "Manila, PH",
  "employment_type": "regular",
  "description": "We are looking for...",
  "requirements": "3+ years experience...",
  "benefits": "Health insurance, ...",
  "salary_range": "₱50,000 - ₱80,000",
  "is_active": true,
  "closes_at": "2026-04-01",
  "business_unit_id": "uuid"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Job title |
| `employment_type` | Yes | Employment type enum value |
| `description` | Yes | Full job description |
| `is_active` | Yes | Whether to publish immediately |
| `department` | No | Department name |
| `location` | No | Work location |
| `requirements` | No | Requirements text |
| `benefits` | No | Benefits text |
| `salary_range` | No | Salary range string |
| `closes_at` | No | Application deadline |
| `business_unit_id` | No | Business unit UUID |

If `is_active` is `true`, `published_at` is set automatically. `created_by` is set from the authenticated user.

### Response

Returns `201` with the created job posting.

---

## GET /api/jobs/[id]

Get a single job posting by ID.

### Authentication

Requires `admin` or `super_admin` role.

### Response

Returns the full job posting object. Returns `404` if not found or soft-deleted.

---

## PATCH /api/jobs/[id]

Update a job posting. Validated with `updateJobPostingSchema` (all fields optional).

### Authentication

Requires `admin` or `super_admin` role.

### Request Body

Same fields as POST, all optional. `updated_at` is set automatically.

---

## DELETE /api/jobs/[id]

Soft-delete a job posting by setting `deleted_at` and `is_active = false`.

### Authentication

Requires `admin` or `super_admin` role.

### Response

```json
{ "success": true }
```

---

*Last updated: 2026-03-08*
