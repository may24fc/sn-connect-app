# Super Admin Features

This guide covers features exclusive to Super Admins: task management, payroll approvals, and system monitoring.

> Super Admins also have access to all Admin features. See the [Admin Guides index](README.md) for the complete list.

## Task Management (`/super-admin/tasks`)

Super Admins are the only role that can create and assign tasks to employees.

### Task Overview

Summary cards at the top:

| Card | Description |
|------|-------------|
| **Total** | All tasks in the system |
| **Pending** | Not yet started |
| **In Progress** | Currently being worked on |
| **Completed** | Finished |
| **Overdue** | Past due date and not completed |

### Creating a Task

1. Click **"Create Task"**
2. Fill in the form:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Task name |
| Description | Yes | Detailed instructions |
| Priority | Yes | Low, Medium, High, or Urgent |
| Category | No | Task classification |
| Due Date | Yes | Deadline |
| Assignees | Yes | Select one or more employees |

3. Click **Create**

The task appears in the task list and is visible to all assigned employees on their Tasks page.

### Managing Tasks

- **Search** by title or description
- **Filter** by status, priority, assignee, or date range
- **Status dropdown** — Change a task's status directly from the list
- **Bulk delete** — Select tasks with checkboxes and click **Delete**

### Task Detail (`/super-admin/tasks/[id]`)

Click a task to view:

- Full task information
- Assignee list
- Status history
- Activity timeline
- Comments section

## Payroll Approvals (`/super-admin/payroll-approvals`)

Review and approve employee invoice submissions.

### Overview Cards

| Card | Color | Description |
|------|-------|-------------|
| **Pending Review** | Yellow | Invoices awaiting your decision |
| **Approved** | Green | Invoices you've approved |
| **Rejected** | Red | Invoices you've rejected |
| **Total Pending Amount** | — | Sum of pending invoices (PHP) |

### Quick Review Carousel

A carousel at the top cycles through pending invoices for quick processing:

- Employee name, avatar, and department
- Invoice number and period
- Amount
- Submission date
- **View Document**, **Approve**, and **Reject** buttons
- Navigation arrows and position indicator (e.g., "2/5")

### Pending Tab

A full table of pending invoices:

| Column | Content |
|--------|---------|
| Employee | Name, avatar, department |
| Invoice # | Invoice number |
| Period | Pay period |
| Amount | PHP amount |
| Submitted | Submission date |
| Actions | View, Approve, Reject |

### Processed Tab

Previously reviewed invoices:

| Column | Content |
|--------|---------|
| Employee | Name, avatar, department |
| Invoice # | Invoice number |
| Period | Pay period |
| Amount | PHP amount |
| Status | Approved / Rejected badge |
| Reviewed | Date and reviewer name |
| Actions | View, Download |

### Approving or Rejecting

1. Click **Approve** or **Reject** on an invoice
2. A confirmation dialog appears:
   - Invoice summary
   - **Notes field** — Optional for approval, required for rejection
3. Click **Confirm**

The employee sees the updated status on their Invoice page.

> **Tip:** For rejections, always include clear notes explaining what needs to be corrected so the employee can resubmit.

## System Health Monitoring

The Super Admin Dashboard includes system-level monitoring:

### System Health Card

| Component | What It Shows |
|-----------|---------------|
| **Database** | Connection status and uptime percentage |
| **API Services** | API response health |
| **Authentication** | Auth service status |
| **File Storage** | Storage service availability |

Each component shows a **Healthy** or **Degraded** badge with an uptime progress bar.

### Security Alerts

Tracks security-relevant events:

- Login attempts (successful and failed)
- Permission changes
- Data access events
- Severity badges (High, Medium, Low)

### Audit Logs

Timeline of system actions:

- User account creation
- System settings updates
- Performance review approvals
- Actor and timestamp for each entry
- **"View All"** link to the full audit log

### User Role Distribution

Breakdown of users by role:

| Role | Display |
|------|---------|
| Employees | Count, percentage, progress bar |
| Admins | Count, percentage, progress bar |
| Interns | Count, percentage, progress bar |
| Super Admins | Count, percentage, progress bar |

## Admin Notifications (`/admin/notifications`)

The admin notification center displays system notifications with:

- **Filters** — Read/Unread, notification type
- **Bulk Select** — Check multiple notifications for batch operations
- **Mark Read** — Mark selected notifications as read
- **Delete** — Remove selected notifications
- **Pagination** — Navigate through notification history

Notification types include: task assignments, report submissions, leave requests, onboarding completions, and system alerts. Each type has a distinct icon and color.

---

*Last updated: 2026-03-08*

Previous: [AI Knowledge Base](ai-knowledge.md) · Back to [Admin Guides](README.md)
