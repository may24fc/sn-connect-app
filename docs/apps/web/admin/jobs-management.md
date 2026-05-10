# Jobs Management

This guide covers creating, editing, archiving job postings and managing incoming applications.

## Job Postings (`/admin/jobs`)

The Jobs page displays all job postings in a sortable table with stats cards.

### Dashboard Stats

Three stat cards at the top:

- **Total Postings** — all job postings
- **Active** — currently published postings
- **Archived** — deactivated postings

### Search and Filter

- **Search** by title, department, or description
- **Filter by Type** — All, Full-time, Part-time, Internship, Contract
- **Filter by Status** — All, Active, Archived

### Job Postings Table

Sortable columns:

| Column | Description |
|--------|-------------|
| Title | Job title |
| Department | Team or division |
| Type | Employment type badge |
| Status | Active (green) or Archived (gray) |
| Created | Date posted |
| Actions | Edit and Archive buttons |

### Creating a Job Posting

1. Click **"Create Job"**
2. A slide panel opens with the form:
   - **Job Title** *(required)*
   - **Business Unit** — select from active business units
   - **Location** — e.g. Remote, Cebu
   - **Team / Division**
   - **Employment Type** — Full-time, Part-time, Internship, Contract
   - **Salary Range**
   - **Description** *(required)*
   - **Requirements**
   - **Benefits**
   - **Closing Date**
   - **Publish immediately** — checkbox, defaults to checked
3. Click **"Create Posting"**

If "Publish immediately" is unchecked, the posting is saved as a draft (is_active = false).

### Editing a Job Posting

1. Click the **Edit** (pencil) icon on any row
2. The same slide panel opens pre-filled with current values
3. Modify fields and click **"Update Posting"**

### Archiving a Job Posting

1. Click the **Archive** icon on any active posting
2. The posting is soft-deleted (`deleted_at` set) and removed from public view
3. Archived postings remain visible in the admin table when filtering by "Archived"

### Restoring an Archived Job Posting

Archived postings can be restored to active status:

1. Set the **Status** filter to **Archived**
2. Click the **Restore** icon on the archived posting
3. The posting reverts to active and becomes visible in the public jobs board again

`POST /api/jobs/[id]/restore` — Restores a soft-deleted job posting.

### API Reference

| Operation | Endpoint |
|-----------|----------|
| List postings | `GET /api/jobs` |
| List archived | `GET /api/jobs/archived` |
| Create posting | `POST /api/jobs` |
| Update posting | `PATCH /api/jobs/[id]` |
| Archive posting | `DELETE /api/jobs/[id]` |
| Restore posting | `POST /api/jobs/[id]/restore` |

See [API: Jobs](../api/jobs.md) for full request/response details.

## Applications (`/admin/jobs/applications`)

Navigate to applications via the **"View Applications"** button on the Jobs page.

### Application Pipeline

Applications follow a status pipeline:

| Stage | Description |
|-------|-------------|
| **Pending** | New application, not yet reviewed |
| **Reviewed** | Application has been read by HR |
| **Shortlisted** | Candidate selected for further evaluation |
| **Interview** | Interview scheduled or completed |
| **Approved** | Approved for hiring (super_admin only) |
| **Hired** | Candidate officially hired |
| **Rejected** | Application rejected |

> **Note:** Only `super_admin` users can set the status to **Approved**.

### Search and Filter

- **Search** by applicant name or email
- **Filter by Status** — Any status from the pipeline
- **Filter by Job** — Filter to a specific job posting
- **Pagination** with configurable page size

### Candidate Detail

Click on an application row to open the candidate detail drawer:

- Applicant name, email, phone
- Applied position and job posting title
- Resume preview (if uploaded)
- Status timeline
- Action buttons to advance or reject

### Changing Application Status

1. Open the candidate detail drawer
2. Select the new status from the dropdown
3. Confirm the change

Status changes are reflected immediately in the table.

### API Reference

| Operation | Endpoint |
|-----------|----------|
| List applications | `GET /api/applications` |
| Get application detail | `GET /api/applications/[id]` |
| Update status | `PATCH /api/applications/[id]` |

See [API: Applications](../api/applications.md) for full request/response details.

---

*Last updated: 2026-03-08*
