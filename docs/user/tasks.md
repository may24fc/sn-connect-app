# Tasks

The Tasks page (`/tasks`) shows all tasks assigned to you and lets you track your progress.

## Viewing Tasks

Tasks are organized into tabs:

| Tab | Description |
|-----|-------------|
| **All Tasks** | Every task assigned to you |
| **Pending** | Not yet started |
| **In Progress** | Currently being worked on |
| **Completed** | Finished tasks |
| **Blocked** | Waiting on dependencies |

Each tab shows a count badge so you can see at a glance how many tasks are in each state.

## Filtering and Searching

- **Search bar** — Find tasks by title or description
- **Priority filter** — Show only Low, Medium, High, or Urgent tasks
- **Date range filter** — Narrow results to a specific time window

## Task Cards

Each task is displayed as a card showing:

- **Title** and short description
- **Priority badge** — Color-coded (green = Low, yellow = Medium, orange = High, red = Urgent)
- **Status indicator** — Current state
- **Due date** — With overdue warning if past due
- **Category tag** — Task classification
- **Created by** — Who assigned the task

## Viewing Task Details

Click any task card to open the detail view (`/tasks/[id]`):

- Full task description
- Priority badge and status badge
- Due date
- Assigned by and assigned to information
- **Update Status** dropdown — change the task status inline with toast confirmation

## Updating Task Status

From the task detail page, use the **Update Status** dropdown to move a task between states:

1. **Pending** → **In Progress** — When you start working on the task
2. **In Progress** → **Completed** — When you finish
3. Any state → **Cancelled** — If the task is no longer needed

A toast notification confirms the status change.

## Submitting Task Proof

When you mark a task as **Completed**, you can upload proof files to verify your work.

### How to Submit Proof

1. Open the task detail page (`/tasks/[id]`)
2. Change the task status to **Completed**
3. A **"Upload Proof"** section appears below the status
4. Click **Upload** and select one or more files (images, PDFs, documents)
5. Files are saved and visible to your Super Admin

### Supported Formats

- Images (PNG, JPG, JPEG, GIF)
- Documents (PDF, DOCX)
- Other files up to 50 MB each

> **Note:** Uploading proof is optional but recommended for tasks that require verification.

> **Note:** Only Super Admins can create and assign tasks. You can update the status of tasks assigned to you.

---

*Last updated: 2026-03-26*

Next: [Documents](documents.md) · Previous: [Dashboard](dashboard.md)
