# Applications API

> Audience: Developers

Management of job applications submitted through job postings. Supports listing with search/filter/pagination, viewing individual applications with associated job posting and requisition data, status updates, and a dedicated hire action that atomically updates requisition headcount.

**Related hooks:** `useApplications`, `useApplication`  
**Zod schemas:** `apps/web/src/lib/schemas/job.schema.ts` (`applicationFiltersSchema`, `updateApplicationStatusSchema`)  
**Database tables:** `job_applications`, `job_postings`, `job_requisitions`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/applications` | admin | List job applications |
| `GET` | `/api/applications/[id]` | admin | Get application detail with job posting |
| `PATCH` | `/api/applications/[id]` | admin | Update application status |
| `POST` | `/api/applications/[id]/hire` | admin | Hire an approved application and update headcount atomically |

---

## GET /api/applications

List job applications with optional search, filter, and pagination.

### Authentication

Requires `admin` role.

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
        "title": "Software Engineer",
        "job_requisition": {
          "id": "uuid",
          "total_headcount": 2,
          "filled_headcount": 1,
          "status": "open"
        }
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

Requires `admin` role.

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
      "employment_type": "regular",
      "job_requisition": {
        "id": "uuid",
        "total_headcount": 2,
        "filled_headcount": 1,
        "status": "open"
      }
    }
  }
}
```

Returns `404` if application not found or soft-deleted.

---

## PATCH /api/applications/[id]

Update the status of a job application. Validated with `updateApplicationStatusSchema`.

### Authentication

Requires `admin` role.

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

> `status: "hired"` is not allowed through this generic status endpoint. Use the dedicated hire action so requisition headcount stays accurate.

### Response

Returns the updated application with job posting title.

---

## POST /api/applications/[id]/hire

Hire an approved application and atomically update the linked requisition.

### Authentication

Requires `admin` role.

### Behavior

1. Confirms the application exists and is already `approved`
2. Marks the application as `hired`
3. Increments `job_requisitions.filled_headcount`
4. Marks the requisition `filled` when capacity is reached
5. Closes the linked posting by setting `job_postings.is_active = false` when the final slot is filled

### Response

```json
{
  "data": {
    "applicationId": "uuid",
    "jobPostingId": "uuid",
    "requisitionId": "uuid",
    "applicationStatus": "hired",
    "filledHeadcount": 2,
    "totalHeadcount": 2,
    "requisitionStatus": "filled",
    "postingIsActive": false,
    "autoClosed": true
  }
}
```

---

*Last updated: 2026-03-08*
