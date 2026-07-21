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

## OKR Targets

Within each objective, admins can manage individual targets (key results).

### Adding a Target

1. Open an OKR from the performance dashboard or employee detail page
2. Click **"Add Target"**
3. Fill in:
   - **Title** — Target description
   - **Metric Type** — Number, Boolean, Currency, Tasks, or **Scale**
   - **Target Value** — Numeric goal (or max value for Scale type)
   - **Min Value** — (Scale only) Minimum value on the scale
   - **Current Value** — Starting progress
   - **Weight** — Importance relative to other targets
4. Click **Save**

### Editing / Deleting Targets

Use the action menu on each target row to edit or delete.

### API Reference

| Operation | Endpoint |
|-----------|----------|
| List targets | `GET /api/performance/okr-targets?okrId=...` |
| Create target | `POST /api/performance/okr-targets` |
| Update target | `PATCH /api/performance/okr-targets` |
| Delete target | `DELETE /api/performance/okr-targets?id=...` |

See [API: Performance](../api/performance.md) for full details.

## Evaluations (`/admin/performance/evaluations`)

The Evaluations page groups OKRs by status:

| Section | Description |
|---------|-------------|
| **For Approval** | OKRs submitted by employees awaiting admin review |
| **For Review** | OKRs where manager evaluation is pending |
| **Completed** | OKRs that have been fully evaluated |

### Evaluating an OKR

The evaluation is a 2-step modal:

1. **Step 1: Rate Targets** — Rate each target individually using a compact rating selector
2. **Step 2: Overall Rating** — Provide an overall OKR rating and written comments

Click **Submit Evaluation** to finalize.

## KPI Evidence Attachments

Employees can upload evidence files to support their KPI achievements. As an admin or manager, you can review uploaded evidence during the evaluation process.

### Viewing Evidence

1. Open the employee performance detail page
2. Navigate to the **KPIs** tab
3. KPIs with uploaded evidence show a **View Evidence** button
4. Click to see attached files (images, PDFs, documents) uploaded by the employee

### API Reference

| Operation | Endpoint |
|-----------|----------|
| List evidence | `GET /api/performance/kpis/[id]/evidence` |
| Upload evidence | `POST /api/performance/kpis/[id]/evidence` |

## Team Performance (`/admin/performance/team`)

The **Team Performance** view provides an aggregate overview of all employees'’ performance in the current cycle. Use the multi-select filters for **department**, **role**, and **status** to slice the data.

`GET /api/performance/team` — Returns aggregated performance data for team views.

## Individual Performance (`/admin/performance/individual`)

The Individual Performance page shows a searchable employee directory table for viewing per-employee performance.

- **Search** by name or email
- **Filter** by role, department
- **Pagination** with configurable page size

Click an employee row to navigate to their performance detail.

### Employee Performance Detail (`/admin/performance/employee/[id]`)

This page provides a comprehensive view of a single employee's performance:

- **Header Card** — Employee name, department, role, avatar
- **Overall Score** — Weighted mean performance score
- **View Tab** — Read-only list of objectives with expandable targets and progress bars
- **Evaluate Tab** — Launch the 2-step evaluation modal for any OKR
- **Reviews Sub-tab** — Historical review scores and comments

## Exporting Reports

Click **"Export Report"** to download performance data for payroll processing, talent reviews, or compliance.

---

## My OKRs Workspace (`/admin/performance/my-okrs`)

Admins and super admins who also have OKRs assigned to them (e.g., leadership OKRs) can use the **My OKRs** self-service workspace to:

- View and update their own objectives and targets
- Submit OKRs for evaluation without needing a manager to initiate it
- Track personal progress against cycle targets

This route is distinct from the admin-wide **Evaluations** view (`/admin/performance/evaluations`), which is for reviewing other employees' OKRs.

---

## Submission Deadlines

Each review cycle can now have a **Self-assessment submission deadline** separately from the cycle end date. During the final week before that cut-off, employees and associates who still have incomplete OKR/KPI setup or missing progress updates receive automated reminders, and the self-assessment deadline reminder still goes out before the cut-off.

When creating or editing a cycle, the deadline picker appears below the cycle end date field. Leave it blank to have no enforced deadline.

> **Note:** The manager review deadline field was removed in a schema simplification. Managers are now expected to complete reviews within the cycle's end date.

---

*Last updated: 2026-04-10*

Next: [Probation Tracking](probation.md) · Previous: [Associate Management](associate-management.md)
