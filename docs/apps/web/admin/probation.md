# Probation Tracking

This guide covers monitoring employee probation periods and conducting evaluations.

## Probation Dashboard (`/admin/probation`)

### Summary Cards

| Card | Color | Description |
|------|-------|-------------|
| **Total Employees** | — | All employees on probation |
| **On Track** | Green | Meeting expectations |
| **At Risk** | Red | Needs improvement or intervention |
| **Completed** | — | Successfully passed probation |

### Search and Filter

- **Search** by name or email
- **Status filter** — All, On Track, At Risk, Extended, Completed
- **Department filter** — Narrow by department

### Employee Probation Table

| Column | Content |
|--------|---------|
| Employee | Avatar, name, position |
| Department | Department name |
| Stage | Visual 4-stage progress indicator |
| Status | On Track / At Risk / Extended / Completed badge |
| Documents | Progress bar showing document completion (X/Y) |
| Days Remaining | Days left in probation |
| Actions | View, Add Note, Advance Stage |

## Probation Stages

Probation is tracked across four stages:

| Stage | Purpose |
|-------|---------|
| **Stage 1** | Initial orientation and settling in |
| **Stage 2** | Early performance assessment |
| **Stage 3** | Mid-probation review |
| **Stage 4** | Final evaluation before regularization |

The stage column shows a visual progress indicator so you can see at a glance where each employee stands.

## Probation Statuses

| Status | Meaning |
|--------|---------|
| **On Track** | Employee is meeting expectations |
| **At Risk** | Performance concerns identified — requires attention |
| **Extended** | Probation period has been extended |
| **Completed** | Employee has passed probation |

## Conducting an Appraisal

1. Click **"View"** on an employee row to open the **Performance Appraisal Modal**
2. The modal has three tabs:

### OKRs Tab

- View the employee's objectives and key results
- Each objective has a progress bar showing completion
- Rate each objective using the star rating input (1–5 stars)

### KPIs Tab

- View the employee's KPIs with target, actual, and score values
- Rate each KPI using the star rating input

### Overall Rating Tab

- Select an overall star rating (1–5)
- Choose a rating category from the dropdown:
  - Exceptional
  - Exceeds Expectations
  - Meets Expectations
  - Needs Improvement
  - Unsatisfactory
- Write feedback in the text area
- Click **Submit Appraisal**

## Extending Probation

If an employee needs more time:

1. Select the **Extend** action from the probation table
2. Provide the reason for extension
3. Confirm

The employee's status changes to **Extended** and a new end date is calculated.

## Advancing Stages

Click **"Advance Stage"** to move an employee to the next probation stage. This is typically done after a stage review or appraisal.

## Adding Notes

Click **"Add Note"** to record observations or feedback about an employee's probation progress. Notes are visible to admins and are timestamped.

---

Next: [Reports Analytics](reports.md) · Previous: [Performance Management](performance-management.md)
