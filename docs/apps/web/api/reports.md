# Reports API

> Audience: Developers

Weekly report management with a draft → submitted → approved/rejected lifecycle. Employees create and submit reports; admins review and approve.

**Related hooks:** `useReports`, `useReport`, `useCreateReport`, `useSubmitReport`, `useReportsRealtime`  
**Zod schema:** `apps/web/src/lib/schemas/report.schema.ts`  
**Database tables:** `reports`, `report_metrics`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/reports` | Any (scoped) | List reports |
| `POST` | `/api/reports` | Any authenticated | Create report with metrics |
| `GET` | `/api/reports/[id]` | Any (RLS) | Get report detail |
| `PATCH` | `/api/reports/[id]` | Any (RLS) | Update report and metrics |
| `POST` | `/api/reports/[id]/submit` | Any authenticated | Submit for review |
| `POST` | `/api/reports/[id]/approve` | admin, super_admin | Approve or reject |

---

## GET /api/reports

List reports with pagination. Non-admins see only their own reports; admins see all.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | `""` | Search by notes |
| `status` | `string` | — | `draft`, `submitted`, `approved`, `rejected` |
| `reportType` | `string` | — | `weekly`, `monthly`, `marketing` |
| `employeeId` | `uuid` | — | Filter by employee (admin only) |
| `page` | `number` | `1` | Page number |
| `pageSize` | `number` | `10` | Results per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "report_type": "weekly",
      "period_start": "2026-02-17",
      "period_end": "2026-02-21",
      "status": "submitted",
      "notes": "Completed sprint tasks",
      "submitted_at": "2026-02-21T17:00:00Z",
      "reviewed_at": null,
      "reviewed_by": null,
      "reviewer_notes": null,
      "created_at": "2026-02-20T10:00:00Z",
      "employees": {
        "first_name": "Juan",
        "last_name": "Dela Cruz"
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 8, "totalPages": 1 }
}
```

### Scoping

- Non-admin users: query automatically filters by `employee_id = current_user_employee_id`
- Admin/super_admin: uses service role client to bypass RLS, can see all reports

---

## POST /api/reports

Create a report with optional metrics.

### Request Body (Zod: `reportCreateSchema`)

```json
{
  "reportType": "weekly",
  "periodStart": "2026-02-17",
  "periodEnd": "2026-02-21",
  "status": "draft",
  "notes": "Sprint 12 progress",
  "metrics": [
    {
      "metricName": "Tasks Completed",
      "metricValue": 8,
      "metricUnit": "tasks",
      "notes": null
    },
    {
      "metricName": "Hours Logged",
      "metricValue": 40,
      "metricUnit": "hours",
      "notes": null
    }
  ]
}
```

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `reportType` | `enum` | Yes | — | `weekly`, `monthly`, `marketing` |
| `periodStart` | `string` | Yes | — | `YYYY-MM-DD` format |
| `periodEnd` | `string` | Yes | — | `YYYY-MM-DD` format |
| `status` | `enum` | No | `"draft"` | `draft`, `submitted`, `approved`, `rejected` |
| `notes` | `string` | No | `null` | Free text |
| `metrics` | `array` | No | `[]` | Array of metric objects |

#### Metric Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metricName` | `string` | Yes | Min 1 char |
| `metricValue` | `number` | Yes | Numeric value |
| `metricUnit` | `string` | No | Unit label (e.g., "hours", "tasks") |
| `notes` | `string` | No | Additional notes |

### Behavior

- Non-admin: `employee_id` is auto-set to current user's employee record
- Admin: can specify `employee_id` in request body
- Metrics are inserted as separate rows in `report_metrics` table linked by `report_id`

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "report_type": "weekly",
    "period_start": "2026-02-17",
    "period_end": "2026-02-21",
    "status": "draft"
  }
}
```

---

## GET /api/reports/[id]

Get a single report with employee info and metrics.

### Response

```json
{
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "report_type": "weekly",
    "period_start": "2026-02-17",
    "period_end": "2026-02-21",
    "status": "submitted",
    "notes": "Sprint 12 progress",
    "submitted_at": "2026-02-21T17:00:00Z",
    "reviewed_at": null,
    "reviewed_by": null,
    "reviewer_notes": null,
    "employees": {
      "first_name": "Juan",
      "last_name": "Dela Cruz"
    },
    "report_metrics": [
      {
        "id": "uuid",
        "metric_name": "Tasks Completed",
        "metric_value": 8,
        "metric_unit": "tasks",
        "notes": null
      }
    ]
  }
}
```

---

## PATCH /api/reports/[id]

Update report fields and optionally replace all metrics.

### Request Body

```json
{
  "notes": "Updated notes",
  "metrics": [
    {
      "metricName": "Tasks Completed",
      "metricValue": 10,
      "metricUnit": "tasks"
    }
  ]
}
```

When `metrics` is provided, all existing metrics are deleted and replaced with the new set.

---

## POST /api/reports/[id]/submit

Submit a draft report for admin review.

### Behavior

Sets `status` to `"submitted"` and `submitted_at` to current timestamp.

### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-02-27T17:00:00Z"
  }
}
```

---

## POST /api/reports/[id]/approve

Approve or reject a submitted report.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body (Zod: `approveBodySchema`)

```json
{
  "action": "approved",
  "notes": "Good work this week"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `enum` | Yes | `"approved"` or `"rejected"` |
| `notes` | `string` | No | Reviewer feedback |

### Behavior

- Sets `status` to the specified action
- Sets `reviewed_at` to current timestamp
- Sets `reviewed_by` to current user's employee ID
- Saves `reviewer_notes`

### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewed_at": "2026-02-27T18:00:00Z",
    "reviewed_by": "admin-employee-uuid",
    "reviewer_notes": "Good work this week"
  }
}
```

---

## Report Lifecycle

```
draft → submitted → approved
                  → rejected → draft (resubmit)
```

---

## Zod Schemas

```typescript
// report.schema.ts
const reportStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
const reportTypeSchema = z.enum(['weekly', 'monthly', 'marketing']);

const reportMetricSchema = z.object({
  metricName: z.string().min(1),
  metricValue: z.number(),
  metricUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const reportCreateSchema = z.object({
  reportType: reportTypeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: reportStatusSchema.default('draft'),
  notes: z.string().optional().nullable(),
  metrics: z.array(reportMetricSchema).default([]),
});
```

---

*Last updated: 2026-02-27*
