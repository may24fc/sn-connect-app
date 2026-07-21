# Associate Management

This guide covers overseeing associates, reviewing daily reports, and managing associate program records.

## Associate Dashboard (`/admin/interns`)

### Summary Cards

Six cards at the top give you a snapshot:

| Card | Description |
|------|-------------|
| **Total Associates** | All-time associate count |
| **Active Associates** | Currently active |
| **Completed Associates** | Successfully finished |
| **Average Progress** | Mean hours completion percentage |
| **Total Hours Logged** | Aggregate hours across all associates |
| **Pending Reports** | EOD reports awaiting review |

### Filtering Associates

- **Search** by name, email, or program
- **Status filter** — Active, Completed, Terminated, On Hold
- **School filter** — Filter by educational institution
- **Supervisor filter** — Filter by assigned supervisor
- Active filters are shown as chips with a **"Clear All Filters"** button

### Grid / List View

Toggle between two layouts using the icons in the top-right:

- **Grid view** — Card layout showing avatar, school, hours progress, status
- **List view** — Compact row layout for scanning many associates quickly

### Associate Cards

Each associate card or row displays:

- Name, school, and program
- Department and supervisor
- Hours progress bar (logged / required)
- Status badge (Active, Completed, Terminated)
- Last report date
- Pending reports count
- **View** action to open the detail page

### Pending Reports Alert

When EOD reports are awaiting review, a warning card prompts you to provide timely feedback.

## Associate Detail (`/admin/interns/[id]`)

Clicking an associate opens their full profile:

- Complete associate profile (school, program, dates, supervisor)
- Full daily report history
- Hour tracking details
- Supervisor feedback
- Status management actions

## Adding a New Associate

1. Click **"Add Associate"** from the associate list page
2. Fill in associate details (name, email, school, program, supervisor, dates, required hours)
3. Click **Save**

The associate account is created with the `associate` role. When they log in, they are directed to the Associate Setup flow.

## Associate Program Lifecycle

| Status | Meaning |
|--------|---------|
| **Active** | Currently participating in the associate program |
| **Completed** | Successfully finished all requirements |
| **Terminated** | Associate program ended early |
| **Converted** | Offered and accepted a regular position |

### Extending an Associate Program

If an associate needs more time:

1. Open the associate's detail page
2. Click **Extend**
3. Provide the new end date and a reason for the extension
4. Click **Confirm**

Extensions are logged and visible in the associate's history.

### Reviewing Daily Reports

1. Navigate to an associate's detail page
2. Scroll to the reports section
3. Review the progress and impact update, hours logged, next steps, and any current blockers
4. Approve the report — this confirms the logged hours

## Exporting Reports

Click **"Export Report"** on the associate list page to download a summary of all associate data, useful for academic reporting or HR audits.

---

Next: [Performance Management](performance-management.md) · Previous: [Employee Management](employee-management.md)
