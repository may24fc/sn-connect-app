# Dashboard API

> Audience: Developers

Role-aware dashboard statistics and pending approval counts. Provides aggregate data for admin, super-admin, and employee dashboards.

**Related hooks:** `useDashboardStats`, `useSuperAdminStats`, `usePendingApprovals`  
**Database tables:** `employees`, `internships`, `performance_reviews`, `users`, `audit_logs`, `reports`, `invoices`, `intern_daily_logs`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard/stats` | Admin roles | Aggregate counts for admin dashboard |
| `GET` | `/api/dashboard/super-admin-stats` | admin, super_admin | Super-admin aggregate stats |
| `GET` | `/api/dashboard/pending` | Admin roles | Pending approvals with latest items |

---

## GET /api/dashboard/stats

Returns aggregate counts for admin dashboard stat cards.

### Authentication

Requires one of: `admin`, `super_admin`, `hr`, `cos`, `ceo`.

### Response

```json
{
  "data": {
    "totalEmployees": 42,
    "activeInterns": 5,
    "reviewsDue": 8,
    "recentHires": 3
  }
}
```

| Field | Description |
|-------|-------------|
| `totalEmployees` | Non-deleted employees count |
| `activeInterns` | Internships with status `active` |
| `reviewsDue` | Performance reviews with status `pending` or `in_progress` |
| `recentHires` | Employees created in the last 30 days |

---

## GET /api/dashboard/super-admin-stats

Returns detailed aggregate stats for the super-admin dashboard including user distribution and recent audit logs.

### Authentication

Requires `admin` or `super_admin` role.

### Response

```json
{
  "data": {
    "totalUsers": 50,
    "activeUsers": 48,
    "auditLogsCount": 120,
    "userRoleDistribution": [
      { "role": "employee", "count": 35, "percentage": 70 },
      { "role": "intern", "count": 8, "percentage": 16 },
      { "role": "admin", "count": 5, "percentage": 10 },
      { "role": "super_admin", "count": 2, "percentage": 4 }
    ],
    "recentAuditLogs": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "action": "user.update",
        "details": "Updated employee profile",
        "timestamp": "2026-03-07T10:00:00Z"
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `totalUsers` | Total non-deleted users |
| `activeUsers` | Users with status `active` |
| `auditLogsCount` | Audit log entries this month |
| `userRoleDistribution` | Role breakdown with percentages (sorted by count desc) |
| `recentAuditLogs` | Last 10 audit log entries |

---

## GET /api/dashboard/pending

Returns counts and latest items for pending approvals across reports, invoices, reviews, and intern EOD reports.

### Authentication

Requires notification admin role (admin or super_admin).

### Response

```json
{
  "data": {
    "pendingReports": {
      "count": 5,
      "overdue": 2,
      "latest": [
        {
          "id": "uuid",
          "employee_id": "uuid",
          "report_type": "weekly",
          "period_start": "2026-03-01",
          "period_end": "2026-03-07",
          "submitted_at": "2026-03-08T10:00:00Z",
          "created_at": "2026-03-08T09:00:00Z"
        }
      ]
    },
    "pendingInvoices": {
      "count": 3,
      "latest": []
    },
    "pendingReviews": {
      "count": 8,
      "latest": []
    },
    "lateEodReports": {
      "count": 1
    },
    "totalPending": 17
  }
}
```

| Field | Description |
|-------|-------------|
| `pendingReports` | Submitted reports awaiting review; `overdue` = period_end > 7 days ago |
| `pendingInvoices` | Submitted invoices awaiting approval |
| `pendingReviews` | Performance reviews with status `pending` or `in_progress` |
| `lateEodReports` | Active interns who haven't submitted yesterday's EOD log |
| `totalPending` | Sum of all pending items |

Each category includes up to 5 latest items.

---

*Last updated: 2026-03-08*
