# Performance Management

This guide covers creating review cycles, monitoring organization-wide performance, and conducting appraisals.

## Performance Dashboard (`/admin/performance`)

### Current Cycle Banner

Shows the active review cycle name, date range, and active badge.

### Performance Summary Cards

| Card | Description |
|------|-------------|
| **Total Employees** | Number of employees in the current cycle |
| **OKRs Completed** | Objectives fully achieved vs. in progress |
| **KPIs On Target** | KPIs meeting their targets vs. below target |
| **Reviews by Status** | Breakdown of review completion stages |

### Cycle Progress

Three progress indicators show completion rates for each review stage:

1. **Self-Assessment** — Percentage of employees who completed their self-review
2. **Manager Review** — Percentage of manager reviews done
3. **HR Review** — Percentage of final HR reviews completed

### Charts

- **Completion Trend** — Monthly review completion over time
- **Department Performance** — Comparison across departments
- **Rating Distribution** — Histogram of performance ratings

### Employee Reviews Table

Searchable, filterable table of all employee reviews:

| Column | Content |
|--------|---------|
| Employee | Name, avatar, email |
| Department | Department name |
| Manager | Assigned manager |
| OKR Progress | Progress bar with percentage |
| KPI Score | Progress bar with percentage |
| Review Status | Status badge |

**Filters:** Search by name/email, filter by department, filter by status.

## Managing Performance Cycles (`/admin/performance/cycles`)

### Creating a New Cycle

1. Click **"Manage Cycles"** from the performance dashboard
2. Click **"Create Cycle"**
3. Fill in:
   - Cycle name (e.g., "Q1 2026 Review")
   - Start and end dates
   - Self-assessment deadline
   - Manager review deadline
4. Click **Create**

### Activating a Cycle

Only one cycle can be active at a time. Activate the cycle to:

- Make OKR/KPI editing available to employees
- Enable self-assessment submissions
- Trigger deadline notifications

### Cycle Lifecycle

```
Draft → Active → Review Period → Closed
```

## Review Flow

The review process follows three stages:

```
1. Self-Assessment (Employee)
   → Employee rates their own OKRs and KPIs, writes reflection

2. Manager Review
   → Manager reviews employee's self-assessment, adds ratings and feedback

3. HR Review
   → Admin/HR gives final rating and signs off
```

### Monitoring Review Progress

From the performance dashboard, track which employees are at each stage. Use the filters to find employees who haven't completed their self-assessment and follow up.

## Performance Ratings

| Rating | Star Equivalent | Description |
|--------|----------------|-------------|
| Exceptional | ★★★★★ | Consistently exceeds expectations |
| Exceeds Expectations | ★★★★ | Frequently surpasses goals |
| Meets Expectations | ★★★ | Achieves all required objectives |
| Needs Improvement | ★★ | Falls short on some objectives |
| Unsatisfactory | ★ | Does not meet minimum requirements |

## Exporting Reports

Click **"Export Report"** to download performance data for payroll processing, talent reviews, or compliance.

---

Next: [Probation Tracking](probation.md) · Previous: [Intern Management](intern-management.md)
