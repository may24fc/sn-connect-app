# Intern Management

This guide covers overseeing interns, reviewing daily reports, and managing internship records.

## Intern Dashboard (`/admin/interns`)

### Summary Cards

Six cards at the top give you a snapshot:

| Card | Description |
|------|-------------|
| **Total Interns** | All-time intern count |
| **Active Interns** | Currently active |
| **Completed Interns** | Successfully finished |
| **Average Progress** | Mean hours completion percentage |
| **Total Hours Logged** | Aggregate hours across all interns |
| **Pending Reports** | EOD reports awaiting review |

### Filtering Interns

- **Search** by name, email, or program
- **Status filter** — Active, Completed, Terminated, On Hold
- **School filter** — Filter by educational institution
- **Supervisor filter** — Filter by assigned supervisor
- Active filters are shown as chips with a **"Clear All Filters"** button

### Grid / List View

Toggle between two layouts using the icons in the top-right:

- **Grid view** — Card layout showing avatar, school, hours progress, status
- **List view** — Compact row layout for scanning many interns quickly

### Intern Cards

Each intern card or row displays:

- Name, school, and program
- Department and supervisor
- Hours progress bar (logged / required)
- Status badge (Active, Completed, Terminated)
- Last report date
- Pending reports count
- **View** action to open the detail page

### Pending Reports Alert

When EOD reports are awaiting review, a warning card prompts you to provide timely feedback.

## Intern Detail (`/admin/interns/[id]`)

Clicking an intern opens their full profile:

- Complete intern profile (school, program, dates, supervisor)
- Full daily report history
- Hour tracking details
- Supervisor feedback
- Status management actions

## Adding a New Intern

1. Click **"Add Intern"** from the intern list page
2. Fill in intern details (name, email, school, program, supervisor, dates, required hours)
3. Click **Save**

The intern account is created with the `intern` role. When they log in, they'll be directed to the Intern Setup flow.

## Internship Lifecycle

| Status | Meaning |
|--------|---------|
| **Active** | Currently doing their internship |
| **Completed** | Successfully finished all requirements |
| **Terminated** | Internship ended early |
| **Converted** | Offered and accepted a regular position |

### Extending an Internship

If an intern needs more time:

1. Open the intern's detail page
2. Click **Extend**
3. Provide the new end date and a reason for the extension
4. Click **Confirm**

Extensions are logged and visible in the intern's history.

### Reviewing Daily Reports

1. Navigate to an intern's detail page
2. Scroll to the reports section
3. Review the tasks completed, hours logged, learnings, and challenges
4. Approve the report — this confirms the logged hours

## Exporting Reports

Click **"Export Report"** on the intern list page to download a summary of all intern data, useful for academic reporting or HR audits.

---

Next: [Performance Management](performance-management.md) · Previous: [Employee Management](employee-management.md)
