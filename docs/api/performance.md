# Performance API

> Audience: Developers

Performance management system covering review cycles, performance reviews, OKRs (Objectives & Key Results), and KPIs (Key Performance Indicators). Supports both admin-managed evaluations and employee self-assessments.

**Related hooks:** `usePerformanceCycles`, `usePerformanceReviews`, `useOKRs`, `useKPIs`, `useIndividualPerformance`  
**Zod schema:** `apps/web/src/lib/schemas/performance.schema.ts`  
**Database tables:** `review_cycles`, `performance_reviews`, `okrs`, `kpis`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/performance/cycles` | Any | List review cycles |
| `POST` | `/api/performance/cycles` | Admin | Create review cycle |
| `PATCH` | `/api/performance/cycles` | Admin | Update review cycle |
| `DELETE` | `/api/performance/cycles?id=` | Admin | Delete review cycle |
| `GET` | `/api/performance/reviews` | Any (scoped) | List performance reviews |
| `POST` | `/api/performance/reviews` | Any | Create performance review |
| `PATCH` | `/api/performance/reviews` | Any | Update performance review |
| `GET` | `/api/performance/okrs` | Any (scoped) | List OKRs |
| `POST` | `/api/performance/okrs` | Any | Create OKR |
| `PATCH` | `/api/performance/okrs` | Any | Update OKR |
| `GET` | `/api/performance/kpis` | Any (scoped) | List KPIs |
| `POST` | `/api/performance/kpis` | Any | Create KPI |
| `PATCH` | `/api/performance/kpis` | Any | Update KPI |
| `GET` | `/api/performance/individual/[employeeId]` | Owner or admin | Full performance dashboard |

---

## Review Cycles

### GET /api/performance/cycles

List review cycles. Optionally filter by status.

**Query:** `?status=active`

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Q1 2026 Review",
      "description": "First quarter performance review",
      "start_date": "2026-01-01",
      "end_date": "2026-03-31",
      "self_review_deadline": "2026-03-15",
      "manager_review_deadline": "2026-03-25",
      "status": "active",
      "created_by": "uuid",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/performance/cycles (Admin)

Create a review cycle.

```json
{
  "name": "Q1 2026 Review",
  "description": "First quarter performance review",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "selfReviewDeadline": "2026-03-15",
  "managerReviewDeadline": "2026-03-25",
  "status": "active"
}
```

### PATCH /api/performance/cycles (Admin)

Update a review cycle. Requires `id` in body.

```json
{
  "id": "uuid",
  "status": "completed"
}
```

### DELETE /api/performance/cycles?id=uuid (Admin)

Hard-delete a review cycle.

---

## Performance Reviews

### GET /api/performance/reviews

List performance reviews. Non-admins see only their own reviews.

**Query:** `?cycleId=uuid&status=pending&employeeId=uuid`

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "cycle_id": "uuid",
      "employee_id": "uuid",
      "reviewer_id": "uuid",
      "status": "pending",
      "self_rating": 4,
      "self_comments": "...",
      "manager_rating": null,
      "manager_comments": null,
      "final_rating": null,
      "goals_for_next_period": null,
      "submitted_at": null,
      "completed_at": null,
      "review_cycles": { "id": "uuid", "name": "Q1 2026", "status": "active" },
      "employees": { "id": "uuid", "first_name": "Juan", "last_name": "Dela Cruz" }
    }
  ]
}
```

### POST /api/performance/reviews

Create a performance review. Non-admins are auto-scoped to their own employee ID.

```json
{
  "cycleId": "uuid",
  "employeeId": "uuid",
  "reviewerId": "uuid",
  "status": "pending",
  "selfRating": 4,
  "selfComments": "Met all Q1 objectives",
  "managerRating": null,
  "managerComments": null,
  "finalRating": null,
  "goalsForNextPeriod": null
}
```

### PATCH /api/performance/reviews

Update review fields. Requires `id` in body.

```json
{
  "id": "uuid",
  "managerRating": 4,
  "managerComments": "Excellent work",
  "status": "completed",
  "completedAt": "2026-03-25T10:00:00Z"
}
```

---

## OKRs

### GET /api/performance/okrs

List OKRs. Non-admins see only their own. Uses admin client for queries to bypass RLS cross-table issues.

**Query:** `?cycleId=uuid&status=in_progress&employeeId=uuid`

### POST /api/performance/okrs

Create an OKR.

```json
{
  "employeeId": "uuid",
  "cycleId": "uuid",
  "objective": "Improve customer satisfaction scores",
  "keyResults": [
    {
      "description": "Reduce ticket response time to <2 hours",
      "targetValue": 2,
      "currentValue": 0,
      "progressPercentage": 0
    }
  ],
  "progress": 0,
  "status": "in_progress"
}
```

### PATCH /api/performance/okrs

Update OKR fields. Supports admin evaluation fields.

```json
{
  "id": "uuid",
  "progress": 75,
  "status": "on_track",
  "adminRating": 4,
  "adminComments": "Good progress on key results",
  "evaluatedBy": "uuid",
  "evaluatedAt": "2026-03-20T10:00:00Z"
}
```

---

## KPIs

### GET /api/performance/kpis

List KPIs. Non-admins see only their own.

**Query:** `?cycleId=uuid&employeeId=uuid`

### POST /api/performance/kpis

Create a KPI.

```json
{
  "employeeId": "uuid",
  "cycleId": "uuid",
  "name": "Monthly Sales Target",
  "targetValue": 100000,
  "currentValue": 0,
  "unit": "PHP",
  "periodStart": "2026-01-01",
  "periodEnd": "2026-03-31"
}
```

### PATCH /api/performance/kpis

Update KPI fields. Supports admin evaluation fields.

```json
{
  "id": "uuid",
  "currentValue": 85000,
  "status": "on_track",
  "adminRating": 3,
  "adminComments": "85% of target achieved"
}
```

---

## GET /api/performance/individual/[employeeId]

Full performance dashboard for a single employee. Non-admins can only view their own profile.

### Response

```json
{
  "employee": {
    "id": "uuid",
    "userId": "uuid",
    "fullName": "Juan Dela Cruz",
    "position": "Software Engineer",
    "department": "Engineering",
    "status": "active",
    "employmentType": "regular",
    "dateHired": "2025-06-01",
    "avatarUrl": "https://...",
    "role": "employee",
    "email": "juan@company.com"
  },
  "kpis": [ /* all KPI records */ ],
  "kpiSummary": {
    "total": 5,
    "completed": 2,
    "avgProgress": 72
  },
  "okrs": [ /* all OKR records */ ],
  "okrSummary": {
    "total": 3,
    "completed": 1,
    "avgProgress": 65
  },
  "reviews": [ /* all reviews with review_cycles */ ],
  "latestReview": { /* most recent review */ }
}
```

---

*Last updated: 2026-02-27*
