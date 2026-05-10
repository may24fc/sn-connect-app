# Probation API

> Audience: Developers

Probation tracker for employees on probationary period. Aggregates employee, OKR, KPI, and document data into a comprehensive probation dashboard. Supports probation extension and evaluation.

**Related hooks:** `useProbationEmployees`  
**Zod schema:** `apps/web/src/lib/schemas/performance.schema.ts` (`probationActionSchema`)  
**Database tables:** `employees`, `okrs`, `kpis`, `documents`, `review_cycles`, `performance_reviews`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/probation` | Admin | List all probationary employees |
| `POST` | `/api/probation` | Admin | Extend or evaluate probation |
| `GET` | `/api/probation/me` | Any authenticated | Get own probation status |

---

## GET /api/probation

Get all employees with an active probation period, enriched with OKRs, KPIs, and status calculations.

### Authentication

Requires admin or super_admin role (`isPerformanceAdmin`).

### Computed Fields

The response computes several fields from raw data:

- **`stage`** (1-4): Calculated from elapsed time ratio within the probation period (25% increments)
- **`status`**: `on-track` (default), `at-risk` (≤14 days remaining), `extended` (end date > hire date + 90 days), `completed` (probation end date passed)
- **`daysRemaining`**: Days until `probation_end_date`
- **OKRs/KPIs**: Filtered to the currently active review cycle

### Response

```json
{
  "data": [
    {
      "id": "employee-uuid",
      "name": "Juan Dela Cruz",
      "email": "juan@company.com",
      "department": "Engineering",
      "position": "Software Engineer",
      "startDate": "2025-12-01",
      "stage": 2,
      "status": "on-track",
      "daysRemaining": 45,
      "manager": "Maria Santos",
      "documentsComplete": 5,
      "totalDocuments": 8,
      "okrs": [
        {
          "id": "uuid",
          "objective": "Complete onboarding tasks",
          "keyResults": [
            {
              "id": "kr-uuid",
              "description": "Complete all training modules",
              "target": "10",
              "current": "7",
              "progress": 70
            }
          ],
          "status": "in_progress"
        }
      ],
      "kpis": [
        {
          "id": "uuid",
          "name": "Code Review Completion",
          "description": "",
          "target": "100%",
          "actual": "85%",
          "score": 85
        }
      ]
    }
  ]
}
```

---

## POST /api/probation

Perform a probation action: extend the probation period or evaluate/complete it.

### Request Body (Zod: `probationActionSchema`)

#### Extend Probation

```json
{
  "action": "extend",
  "employeeId": "uuid",
  "newProbationEndDate": "2026-06-01"
}
```

Updates `employees.probation_end_date` to the new date.

#### Evaluate / Complete Probation

```json
{
  "action": "evaluate",
  "employeeId": "uuid",
  "finalRating": 4,
  "comments": "Excellent performance during probation"
}
```

1. Upserts a `performance_reviews` record in the active cycle with `status: completed`, `final_rating`, and `manager_comments`
2. Clears `employees.probation_end_date` (set to `null`) to indicate probation is complete

### Response

```json
{
  "data": {
    "id": "employee-uuid",
    "probation_end_date": null
  },
  "message": "Probation evaluation completed successfully"
}
```

---

## GET /api/probation/me

Get the current authenticated user's own probation status. Returns computed fields including stage, progress, and days remaining.

### Authentication

Any authenticated user.

### Response (On Probation)

```json
{
  "data": {
    "employeeId": "employee-uuid",
    "name": "Juan Dela Cruz",
    "position": "Software Engineer",
    "department": "Engineering",
    "startDate": "2025-12-01",
    "endDate": "2026-03-01",
    "stage": 3,
    "status": "on-track",
    "daysRemaining": 21,
    "totalDays": 90,
    "elapsedDays": 69,
    "progressPercent": 77
  },
  "onProbation": true
}
```

### Response (Not On Probation)

```json
{
  "data": null,
  "onProbation": false
}
```

### Computed Fields

| Field | Description |
|-------|-------------|
| `stage` | 1–4, based on 25% increments of elapsed time |
| `status` | `on-track`, `at-risk` (≤14 days), `extended` (end > hire+90d), `completed` |
| `daysRemaining` | Days until probation end (min 0) |
| `progressPercent` | Elapsed/total percentage (max 100) |

---

*Last updated: 2026-03-08*
