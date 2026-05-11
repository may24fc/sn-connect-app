# ATS API

> Audience: Developers

Applicant Tracking System (ATS) endpoints. Covers access control (who can view the ATS), access grant management (delegated access for non-admin employees), and job application evaluation pipeline.

**Related hooks:** `useAtsAccess`, `useApplications`, `useApplication`  
**Related docs:** [applications.md](applications.md), [jobs.md](jobs.md)  
**Zod schemas:** `apps/web/src/lib/schemas/job.schema.ts`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/ats/access` | Any authenticated | Check if current user can access the ATS |
| `GET` | `/api/ats/access-grants` | admin/super_admin | List all delegated ATS access grants |
| `POST` | `/api/ats/access-grants` | admin/super_admin | Grant ATS access to a non-admin user |
| `DELETE` | `/api/ats/access-grants` | admin/super_admin | Revoke an ATS access grant |

Application endpoints (shared with admin) live under `/api/applications/`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/applications` | ATS access | List applications with search/filter/pagination |
| `GET` | `/api/applications/[id]` | ATS access | Application detail with job posting data |
| `PATCH` | `/api/applications/[id]` | ATS access | Update application status |
| `POST` | `/api/applications/[id]/hire` | ATS access | Hire an approved applicant and adjust headcount |
| `POST` | `/api/applications/[id]/evaluate` | ATS access | Run AI-assisted resume evaluation |
| `POST` | `/api/applications/bulk-import` | ATS access | Bulk import applications from parsed resumes |

---

## ATS Access Model

Users can reach the ATS (`/ats/*` route group) if they are:
- `admin` or `super_admin` role, OR  
- Any role with an active `ats_access_grants` row in the database (delegated access)

The `GET /api/ats/access` endpoint is checked by the `AtsLayout` on every route mount and redirects users without access.

### Access Response

```json
{
  "data": {
    "canAccess": true,
    "hasGrant": false,
    "role": "admin"
  }
}
```

| Field | Description |
|-------|-------------|
| `canAccess` | Whether the user may access the ATS |
| `hasGrant` | Whether access came from a delegated grant (not from role) |
| `role` | Current user's role |

---

## GET /api/ats/access-grants

List all active delegated ATS access grants.

### Authentication

Requires `admin` or `super_admin` role.

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "granted_by": "uuid",
      "created_at": "2026-04-10T09:00:00Z",
      "users": {
        "id": "uuid",
        "full_name": "Ana Santos",
        "email": "ana@example.com"
      }
    }
  ]
}
```

---

## POST /api/ats/access-grants

Grant delegated ATS access to any user in the system.

### Request Body

```json
{
  "userId": "uuid"
}
```

### Response

`201 Created`

```json
{
  "data": { "id": "uuid", "user_id": "uuid", "granted_by": "uuid" }
}
```

---

## DELETE /api/ats/access-grants

Revoke a delegated ATS access grant.

### Request Body

```json
{
  "userId": "uuid"
}
```

---

## POST /api/applications/[id]/evaluate

Run an AI-assisted evaluation of the applicant's resume against the job posting requirements. Saves a structured evaluation score and summary to the application record.

### Authentication

Requires ATS access.

### Response

```json
{
  "data": {
    "score": 82,
    "summary": "Strong match for the technical requirements. 4 of 5 required skills present. Lacks direct experience with PostgreSQL but demonstrates equivalent database background.",
    "strengths": ["TypeScript proficiency", "React experience", "Team collaboration indicators"],
    "gaps": ["PostgreSQL specific experience"]
  }
}
```

---

## POST /api/applications/bulk-import

Import multiple applications from parsed resume files. The endpoint accepts structured parsed resume data (extracted via `unpdf`) and creates application records in bulk.

### Request Body

```json
{
  "jobPostingId": "uuid",
  "applications": [
    {
      "fullName": "Maria Santos",
      "email": "maria@example.com",
      "phone": "+63 912 345 6789",
      "resumeText": "...",
      "linkedinUrl": "https://linkedin.com/in/maria"
    }
  ]
}
```

---

## Application Status Flow

```
pending → reviewed → shortlisted → interview → approved → hired
                                              ↓
                                           rejected
```

| Status | Description |
|--------|-------------|
| `pending` | Newly submitted, not yet reviewed |
| `reviewed` | Opened and reviewed by a recruiter |
| `shortlisted` | Selected for further consideration |
| `interview` | Interview scheduled or completed |
| `approved` | Ready to hire — pending headcount update |
| `rejected` | Removed from pipeline |
| `hired` | `POST /hire` called — headcount decremented |

---

## Employee ATS Route Group

Employees with ATS access reach the pipeline through the `(employee)/ats/` route group:

| Route | Description |
|-------|-------------|
| `/ats/jobs` | Browse open job postings |
| `/ats/jobs/applications` | Application pipeline kanban/table |
| `/ats/jobs/archive` | Archived job postings |
| `/ats/recruitment` | Recruitment overview dashboard |
