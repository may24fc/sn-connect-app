# SN Connect HR Portal — User Testing Guide

**Date:** February 2026 | **Version:** 1.0

Welcome! This guide helps you explore and test the SN Connect HR Portal. No technical knowledge required — just follow the steps below for your role.

---

## Quick Start: How to Log In

1. Open the portal in your browser
2. Enter your test email and password (see table below)
3. Click **Sign In** — you'll be redirected to your role's dashboard

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | `employee@example.com` | `SamplePass!234` |
| Intern | `intern@example.com` | `SamplePass!234` |
| Admin (HR) | `admin@example.com` | `Sample!234` |
| Super Admin | `super-admin@example.com` | `Sample!234` |

> **Tip:** Use different browsers or private/incognito tabs to test multiple roles at the same time.

---

## Role 1: Employee

### Dashboard
- After login, you land on your **Dashboard**
- Review the greeting, your stats (onboarding progress, tasks due, notifications), and the quick actions grid

### My Tasks (`/tasks`)
1. Click **Tasks** in the left sidebar
2. Browse tasks using the **All / Pending / In Progress / Completed / Blocked** tabs
3. Use the search bar or priority filter to narrow results
4. Click a task card to view its details

### My Profile (`/profile`)
1. Click **Profile** in the sidebar
2. Browse the **Personal Info**, **Emergency Contact**, and **Security** tabs
3. Click **Edit Profile** to update your name, phone, address, etc.
4. Click **Save Changes** — a confirmation message should appear

### Documents / 201 Files (`/files`)
1. Click **Documents** in the sidebar
2. View the document completion progress bar at the top
3. Find a document with status **Not Uploaded** and click its action menu → **Upload**
4. Drag and drop a file (PDF, JPG, or PNG, max 10 MB) or click to browse
5. Confirm the upload — the document status should update

### Invoice (`/invoice`)
1. Click **Invoice** in the sidebar
2. Review your invoice stats (total, approved, pending, amount)
3. Click **Submit Invoice** → fill in the invoice number, pay period (start/end dates), amount, and optional notes
4. Click **Submit** — it should appear in your submission history table

### Reports (`/reports`)
1. Click **Reports** in the sidebar
2. Click **New Report** → select a report type, pick the week, fill in your accomplishments and plans
3. Save as draft or submit
4. Your report appears in the list with a status badge

### Performance Reviews (`/performance`)
1. Click **Performance Reviews** in the sidebar
2. Review the current cycle banner and your OKR/KPI progress gauges
3. Click **OKRs** or **KPIs** quick action cards to see detail pages
4. Click **Start Review** to begin your self-assessment

### Information Hub (`/information-hub`)
1. Click **Information Hub** in the sidebar
2. On the **Announcements** tab, filter by category (HR Updates, Benefits, Events, etc.) and click a card to read it
3. Switch to the **Resources** tab to browse company resources — use the search bar or category browser to filter
4. Bookmark a resource by clicking the star/bookmark icon on a resource card

### Onboarding (`/onboarding`)
- If you're a newly created employee, the system redirects you to the **Onboarding Wizard** before you can access the portal
- Complete the 4 steps: **Personal Info → Payment Info → Documents → Review**
- Upload the required documents (Valid ID, Profile Photo, CV, Birth Certificate)
- Click **Submit** on the final step — you'll see an "Onboarding Complete" page

---

## Role 2: Intern

Interns have a simplified experience focused on daily reporting and task tracking.

### Intern Dashboard (`/intern/dashboard`)
1. After login you land on the **Intern Dashboard**
2. Review your hours progress, days remaining, and whether today's EOD report is submitted
3. If no report yet, click **Submit Now** and fill in tasks completed, hours logged, and learnings
4. Click **Submit**

### Available Features (same as Employee)
- **Tasks** — view and track assigned tasks
- **Profile** — update personal info
- **Documents** — upload required 201 files
- **Performance Reviews** — view OKRs, KPIs, and self-assessment
- **Information Hub** — read announcements and browse resources

> **Note:** Interns do **not** have access to Invoice or Reports.

---

## Role 3: Admin (HR)

### Admin Dashboard (`/admin/dashboard`)
- Overview of total employees, active interns, and reviews due
- Click **Manage Employees** (top right) to go to employee management
- **Quick Actions** grid links to Employee Management, Performance, Recruitment, and Reports

### Reports Tracking (`/admin/reports`)
1. Click **Reports** in the sidebar
2. Select a week from the dropdown to see who has and hasn't submitted
3. Click **Send Reminder** next to pending staff
4. Click **Analytics** (top right) for charts: expenditure vs results, ROI by department

### Performance (`/admin/performance`)
1. Click **Performance** in the sidebar
2. Review the org-wide OKR/KPI summary cards and charts
3. Click **Manage Cycles** to create or activate a performance review cycle
4. Search/filter the employee reviews table and click a row to view details

### Employee Probation (`/admin/probation`)
1. Click **Employee Probation** in the sidebar
2. Filter the table by status (On Track, At Risk, Extended, Completed)
3. Click **View** on an employee to open their appraisal modal
4. Rate their OKRs and KPIs, select an overall rating, and add feedback
5. Click **Submit Appraisal**

### Intern Management (`/admin/interns`)
1. Click **Interns** in the sidebar
2. Search or filter by status, school, or supervisor
3. Toggle between **Grid** and **List** views using the icons top-right
4. Click an intern card/row to open their detail page (reports, hours, status)
5. Click **Add Intern** to create a new intern record

### Announcements (`/admin/announcements`)
1. Click **Announcements** in the sidebar
2. View all announcements with filter options (status, category, priority)
3. Click **Create New** to draft and publish a new announcement
4. Use **Bulk Archive** or **Bulk Delete** for batch management

### Resources (`/admin/resources`)
1. Click **Resources** in the sidebar
2. Browse all company resources (documents, links, videos, etc.) with filters
3. Click **Add Resource** to create a new resource entry
4. Toggle the **Featured** flag on a resource card to highlight it in the Information Hub
5. Archive outdated resources using the action menu

### AI Knowledge (`/admin/ai-knowledge`)
- Add, edit, enable, or disable entries in the AI assistant's knowledge base

---

## Role 4: Super Admin

Super Admins have everything Admins have, plus the following:

### Super Admin Dashboard (`/super-admin/dashboard`)
- View total users, system uptime, security alerts, and audit log counts
- **Security Alerts** card shows login attempts and permission changes
- **System Health** card shows live status of the database, API, auth, and file storage
- **User Role Distribution** shows counts per role

### Task Management (`/super-admin/tasks`)
1. Click **Task Management** in the sidebar
2. Review task summary cards (total, pending, in progress, completed, overdue)
3. Click **Create Task** → fill in title, description, priority, assignees, and due date
4. Click **Save** — the task appears in the list and is visible to assigned employees
5. Select tasks with checkboxes and click **Delete** for bulk removal

### Payroll Approvals (`/super-admin/payroll-approvals`)
1. Click **Payroll Approvals** in the sidebar
2. Review pending invoice submissions from employees
3. Click a row to open the invoice detail — review the amount, period, and attached file
4. **Approve** or **Reject** with optional notes

### Announcements (`/super-admin/announcements`)
- Same as Admin — create and manage announcements visible across all roles

### AI Knowledge (`/admin/ai-knowledge`)
- Same as Admin — manage the HR AI assistant's knowledge entries (shared page)

### Resources (`/super-admin/resources`)
- Same as Admin Resources — manage company resource links and files

---

## What to Look For While Testing

| What | What to Check |
|------|--------------|
| **Login & Logout** | Can you sign in and sign out cleanly? |
| **Navigation** | Does clicking sidebar items take you to the right pages? |
| **Data Display** | Do stats, tables, and lists load without errors? |
| **Forms** | Do forms save, validate, and show success/error messages? |
| **File Uploads** | Do uploads succeed? Are errors shown for invalid file types/sizes? |
| **Role Access** | Can you only see what your role allows? |

---

## Known Limitations (Not Yet Implemented)

These features exist as UI screens but are **not fully functional yet:**

| Feature | Status |
|---------|--------|
| Document approval/rejection by HR | Not implemented — documents can be uploaded but HR cannot approve or reject them yet |
| Profile picture upload | UI placeholder only — upload does not save |
| Emergency contact editing | Form exists but may not save all fields correctly |
| Department management page | No admin UI to create/edit departments |
| Employee bulk export (CSV/Excel) | Not available |
| Email / push notifications | Not sent — no notification delivery system yet |
| n8n automated workflows | Not active (e.g., automatic onboarding task creation for new employees) |
| Manager team-performance & reviews | Pages exist at `/manager/team-performance` and `/manager/reviews` but are accessible only to employees flagged as managers |
| Calendar | Quick action links to `/calendar` — page not built yet |
| Recruitment section | Shown in Quick Actions but not built |
| Mobile optimization | Some pages may not display correctly on small screens |

Thank you for helping test SN Connect! Your feedback makes the product better.
