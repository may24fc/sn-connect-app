# Announcements Management

This guide covers creating, publishing, and managing company announcements.

## Announcements Dashboard (`/admin/announcements` or `/super-admin/announcements`)

### Filters

Filter announcements by:

- **Status** — Draft, Published, Archived
- **Category** — HR Updates, Benefits, Events, Performance, Training
- **Priority** — Normal, Important, Urgent

### Announcement List

Each announcement entry shows:

- Title and content preview
- Category and priority badges
- Status badge (Draft / Published / Archived)
- Published date
- Author
- Analytics preview (views, comments)
- Action menu

## Creating an Announcement

1. Click **"Create New"**
2. Fill in the announcement form:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Headline for the announcement |
| Content | Yes | Full announcement body (rich text) |
| Category | Yes | HR Updates, Benefits, Events, Performance, or Training |
| Priority | No | Normal (default), Important, or Urgent |
| Target Audience | No | All users, specific roles, or specific departments |
| Attachments | No | Upload supporting files |

3. Choose an action:
   - **Save as Draft** — Save without publishing
   - **Publish** — Make visible to the target audience immediately

### Targeting

The **Targeting Selector** lets you control who sees the announcement:

- **All Users** — Visible to everyone
- **By Role** — Select specific roles (employee, intern, admin, super_admin)
- **By Department** — Select specific departments

### Attachments

- Click **"Add Attachment"** or drag and drop files
- Supported formats: PDF, images, documents
- Upload progress is shown per file

## Publishing and Unpublishing

| Action | Effect |
|--------|--------|
| **Publish** | Makes the announcement visible in the Information Hub |
| **Archive** | Removes from the active feed but keeps the record |
| **Restore** | Restores an archived announcement back to published |
| **Pin** | Pins the announcement to the top of the feed |
| **Unpin** | Removes the pin |

### Archiving and Restoring

Archiving an announcement removes it from the employee-facing feed without deleting it. Archived announcements can be restored at any time.

1. Click the **Archive** action on any published announcement
2. The announcement moves to the Archived status and disappears from the Information Hub
3. To restore, filter by **Archived** in the announcement list and click **Restore** from the action menu

`POST /api/announcements/[id]/restore` — Restores an archived announcement to published status.

## Managing Existing Announcements

### Editing

Click an announcement to open the editor. You can modify the title, content, category, priority, targeting, and attachments. Published announcements can be edited — changes take effect immediately.

### Bulk Actions

Select multiple announcements using checkboxes, then:

- **Bulk Archive** — Archive all selected
- **Bulk Delete** — Permanently remove all selected

## Starring Announcements

Employees can **star** announcements to bookmark them for later reference. The star count is visible on the announcement analytics dashboard.

### Starred Metrics

The **AnnouncementAnalyticsDashboard** now includes:

| Metric | Description |
|--------|-------------|
| **Stars** | Total employees who starred the announcement |
| **Views** | Total view count |
| **Unique Views** | Distinct users who viewed |
| **Comments** | Number of comments |
| **Engagement Rate** | Percentage of target audience who engaged |

### API

| Action | Endpoint |
|--------|----------|
| Star an announcement | `POST /api/announcements/[id]/star` |
| View starred list | `GET /api/announcements/starred` |

### Comments

Published announcements may receive comments from employees. View and moderate comments from the announcement detail view.

## Analytics

Each published announcement tracks:

| Metric | Description |
|--------|-------------|
| **Views** | How many users have seen the announcement |
| **Unique Views** | Distinct users who viewed it |
| **Comments** | Number of comments received |
| **Stars** | Users who starred the announcement |
| **Engagement Rate** | Percentage of target audience who viewed |

Access analytics from the announcement's action menu or the **AnnouncementAnalyticsDashboard** view.

## Sending Reminders

For published announcements that haven't reached their full audience:

1. Open the announcement detail
2. Click **"Remind"** from the action menu
3. The system sends a notification to users who haven't viewed the announcement yet

### API Reference

`POST /api/announcements/[id]/remind` — Triggers reminder notifications for unread users.

---

*Last updated: 2026-03-26*

Next: [Resources](resources.md) · Previous: [Reports Analytics](reports.md)
