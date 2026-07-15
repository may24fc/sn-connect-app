# Control Hub HR Portal — Comprehensive Feature Audit & Implementation Checklist

**Audit Date:** March 8, 2026  
**Audit Method:** Playwright E2E tests + source code analysis  
**Audit File:** `e2e/comprehensive-feature-audit.spec.ts`  
**Total Findings:** 20 items across 4 severity levels

---

## Audit Summary

| Category | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 7 | Features in source code but not implemented |
| 🟠 HIGH | 6 | Implemented features not functioning properly |
| 🟡 MEDIUM | 4 | Partial implementations needing completion |
| 🔵 LOW | 3 | Polish and enhancement items |

### Playwright Test Results (36/38 passed)
- All API health checks passed (no 500 errors)
- Many API endpoints returned 404 (auth required — expected, tests lacked auth cookies for direct API calls)
- Dashboard, navigation, and feature pages loaded successfully
- Two test failures were minor test-level bugs (regex syntax, mobile viewport selector)

---

## 🔴 CRITICAL — Features in Code but Not Implemented

### C1. EmployeeDashboard Component Uses 100% Mock Data
**File:** `apps/web/src/components/dashboards/EmployeeDashboard.tsx`  
**Lines:** 30-76  
**Status Update (2026-03-29):** Retired. This legacy component was unused and has been deleted. The live dashboard route owns the real implementation at `apps/web/src/app/(employee)/dashboard/page.tsx`.

**Problem:** The `EmployeeDashboard` component has all data hardcoded:
- `onboardingProgress = 0` (hardcoded, never changes)
- `probationData = { stage: '—', daysRemaining: 0 }` (all dashes)
- `recentTasks: Array<Task> = []` (empty array)
- `announcements = []` (empty array)
- `upcomingEvents = []` (empty array)

**Impact:** Employee dashboard displays empty/zero state despite API hooks being available elsewhere.

**Fix Required:**
- [ ] Wire `useOnboardingProfile()` hook for onboarding progress
- [ ] Wire `useProbation()` hook for probation data
- [ ] Wire `useTasks()` hook for recent tasks
- [ ] Wire `useAnnouncementFeed()` hook for announcements
- [ ] Remove all hardcoded mock data
- [ ] Add proper loading skeletons
- [ ] Add error states

**Subagent:** `frontend-lead` — Replace mock data with real TanStack Query hooks

---

### C2. InternDashboard Component Uses 100% Mock Data
**File:** `apps/web/src/components/dashboards/InternDashboard.tsx`  
**Lines:** 35-67  
**Status Update (2026-03-29):** Retired. This legacy component was deleted after confirming the real implementation already lives at `apps/web/src/app/(employee)/associate/dashboard/page.tsx`.

**Problem:** The `InternDashboard` *component* (not the *page*) uses fully mock data:
- `mockInternProfile` = all dashes and zeros
- `mockRecentReports = []` (empty)
- `mockTasks = []` (empty)
- `handleSubmitReport` = empty function (`// TODO: Implement API call`)

**Note:** The actual page at `apps/web/src/app/(employee)/associate/dashboard/page.tsx` DOES use real hooks (`useInternships`, `useCreateInternDailyLog`). The component file appears to be a legacy/unused version.

**Fix Required:**
- [ ] Determine if `InternDashboard` component is used anywhere
- [ ] If used: wire real hooks matching the page implementation
- [ ] If unused: delete the component to avoid confusion
- [ ] Ensure the page and component aren't both rendered causing conflicts

**Subagent:** `frontend-lead` — Reconcile InternDashboard component vs page

---

### C3. Offboarding Workflow — API Directory Exists but No Implementation
**Files:** `apps/web/src/app/api/offboarding/initiate/` (empty directory)  
**Problem:** The offboarding API directory structure exists but contains no route handlers. No UI page exists either (`/admin/offboarding` returns 404).

**Fix Required:**
- [ ] Create `POST /api/offboarding/initiate` route handler
- [ ] Implement offboarding data model (exit checklist, access revocation, asset return)
- [ ] Create admin UI page at `/admin/offboarding`
- [ ] Add proper RLS policies
- [ ] Add audit logging for sensitive operation

**Subagent:** `api-architect` + `frontend-lead` — Design and implement offboarding workflow

---

### C4. Cron Job for Probation Check — Empty Directory
**Files:** `apps/web/src/app/api/cron/probation-check/` (empty directory)  
**Problem:** No automated probation status evaluation. The Supabase Edge Function `probation-check` exists but the API route for triggering it is empty.

**Fix Required:**
- [ ] Create `GET /api/cron/probation-check` route handler
- [ ] Wire to Supabase Edge Function or implement inline
- [ ] Add Vercel Cron configuration in `vercel.json`
- [ ] Evaluate and update probation status (on-track, at-risk, extended)
- [ ] Create notifications for status changes

**Subagent:** `api-architect` + `devops-engineer` — Implement cron job for probation checks

---

### C5. Calendar/Events Feature — Referenced but Not Implemented
**Problem:** Employee dashboard mentions "view your calendar" in the tour guide, but no `/calendar` page or events API exists. The `upcomingEvents` array is hardcoded empty.

**Fix Required:**
- [ ] Decide if calendar feature is in-scope or should be deferred
- [ ] If in-scope: create events table, API, and calendar page
- [ ] If deferred: remove calendar references from dashboard tour

**Subagent:** `product-architect` — Decide scope and plan calendar feature

---

### C6. Department Management Admin Page — Missing
**Problem:** The departments API (`/api/departments`) has full CRUD, but there is no admin UI page. Department management can only be done via API.

**Fix Required:**
- [ ] Create `/admin/departments/page.tsx`
- [ ] Data table with department list (name, head, employee count)
- [ ] Create/edit/delete department dialogs
- [ ] Department head assignment
- [ ] Add to admin sidebar navigation

**Subagent:** `frontend-lead` — Build department management admin page

---

### C7. CSV/Excel Export — Not Implemented
**Problem:** No export functionality exists for employee data. The admin directory page has no export button. No CSV/Excel libraries are installed.

**Fix Required:**
- [ ] Install CSV export library or implement vanilla CSV generation
- [ ] Add export button to `/admin/directory` page
- [ ] Support filtered exports (by department, status, role)
- [ ] Ensure sensitive fields (SSN, salary) are excluded by default
- [ ] Add audit logging for data exports

**Subagent:** `frontend-lead` — Implement CSV export for employee directory

---

## 🟠 HIGH — Implemented but Not Functioning Properly

### H1. Task Detail Page — Edit Button is Empty Stub
**File:** `apps/web/src/app/(admin)/super-admin/tasks/[id]/page.tsx`  
**Line:** 108  
**Problem:** `const handleEdit = (): void => {};` — Edit button exists in UI but does nothing when clicked.

**Fix Required:**
- [ ] Implement edit handler opening a form/panel
- [ ] Wire to `PATCH /api/tasks/{id}` mutation
- [ ] Add success/error toasts

**Subagent:** `frontend-lead` — Wire task detail edit functionality

---

### H2. Task Detail Page — Delete Has No API Call
**File:** `apps/web/src/app/(admin)/super-admin/tasks/[id]/page.tsx`  
**Line:** 111  
**Problem:** Delete handler shows confirmation dialog but never calls the API. Just redirects.

**Fix Required:**
- [ ] Wire to `DELETE /api/tasks/{id}` mutation
- [ ] Add soft-delete behavior
- [ ] Add audit logging
- [ ] Redirect after successful deletion

**Subagent:** `frontend-lead` — Wire task detail delete functionality

---

### H3. Admin Probation Page — Falls Back to Empty Array
**File:** `apps/web/src/app/(admin)/admin/probation/page.tsx`  
**Line:** 135-137, 242  
**Problem:** While real hooks (`useProbation`, `useRealtimeProbationEmployees`) are wired, there's a fallback `const employees: Array<Employee> = [];` that masks API failures. If the API returns no data or fails, the page silently shows nothing.

**Fix Required:**
- [ ] Remove hardcoded empty `employees` array
- [ ] Add proper error state when API fails
- [ ] Add loading state while data is being fetched
- [ ] Show "No employees on probation" empty state

**Subagent:** `frontend-lead` — Fix probation page error handling

---

### H4. Email Notifications Missing on Onboarding Approval/Rejection
**File:** `apps/web/src/app/api/users/approve-onboarding/route.ts`  
**Lines:** 148, 158  
**Problem:** Two TODO comments indicate email notifications are not sent:
- Line 148: `// TODO: Send approval email notification to user`
- Line 158: `// TODO: Send rejection email notification to user with notes`

**Fix Required:**
- [ ] Integrate Resend email service
- [ ] Create approval email template
- [ ] Create rejection email template (with notes)
- [ ] Send emails after onboarding status update
- [ ] Add email delivery logging

**Subagent:** `api-architect` — Implement email notifications via Resend

---

### H5. Super Admin Dashboard — Placeholder Sections
**File:** `apps/web/src/app/(admin)/super-admin/dashboard/page.tsx`  
**Status Update (2026-03-29):** Partially resolved. The cards now render explicit not-connected states instead of fake empty telemetry. Real alerting and monitoring integrations remain deferred.

**Problem:** Two sections are placeholders with no real data:
- Security alerts: empty/placeholder
- System health monitoring: empty/placeholder

**Fix Required:**
- [ ] Wire security alerts to audit_logs for suspicious activity
- [ ] Implement system health checks (API response times, uptime)
- [ ] Or: remove placeholder sections if not in scope

**Subagent:** `frontend-lead` — Implement or remove super admin dashboard placeholders

---

### H6. Admin Dashboard — Recent Activity Hardcoded Empty
**File:** `apps/web/src/app/(admin)/admin/dashboard/page.tsx`  
**Status Update (2026-03-29):** Resolved. The admin dashboard now uses the live recent-activity hook and a shared empty state.

**Problem:** Recent activity section shows no data. The API for audit_logs exists but isn't wired to the dashboard.

**Fix Required:**
- [ ] Wire `useAuditLogs()` or create hook for recent activity
- [ ] Display last 5-10 audit log entries with timestamps
- [ ] Add proper empty state when no activity exists

**Subagent:** `frontend-lead` — Wire admin dashboard recent activity

---

## 🟡 MEDIUM — Partial Implementations

### M1. Document Status/Approval Workflow
**Problem:** Documents are uploaded and stored but have no review/approval process. No status field, no admin review queue.

**Fix Required:**
- [ ] Add `status` column to documents table (pending, approved, rejected)
- [ ] Create admin document review API endpoints
- [ ] Add document review admin UI
- [ ] Send notifications on status change

**Subagent:** `supabase-schema-architect` + `api-architect` + `frontend-lead`

---

### M2. Bulk Document Operations
**Problem:** No checkbox selection, batch actions, or bulk export on the files page.

**Fix Required:**
- [ ] Add row selection with checkboxes
- [ ] Add bulk action toolbar (delete, mark confidential, export)
- [ ] Create batch API endpoints
- [ ] Add undo capability

**Subagent:** `frontend-lead` — Add bulk operations to files page

---

### M3. Document Versioning
**Problem:** Documents can be overwritten with no history. No version tracking or rollback.

**Fix Required:**
- [ ] Add `version_number` and `parent_document_id` columns
- [ ] Keep all versions on re-upload
- [ ] Add version history UI
- [ ] Allow rollback to previous version

**Subagent:** `supabase-schema-architect` + `frontend-lead`

---

### M4. Profile Change Request Email Notifications
**Problem:** Profile change requests can be submitted and approved/rejected via API, but no email notifications are sent.

**Fix Required:**
- [ ] Send email when profile change is requested
- [ ] Send email when change is approved/rejected
- [ ] Include change details in email body

**Subagent:** `api-architect` — Add email notifications to profile change requests

---

## 🔵 LOW — Polish & Enhancement

### L1. Files Page Missing Advanced Filters
**Problem:** API supports search, document type, and date range filters, but the UI only exposes basic search.

**Fix Required:**
- [ ] Add document type filter dropdown
- [ ] Add date range picker
- [ ] Add sort options (name, date, size)

**Subagent:** `frontend-lead`

---

### L2. Mobile Responsiveness Not Fully Tested
**Problem:** Pages are built with responsive classes but Playwright mobile viewport tests show potential issues (login page form labels not found at 375px width).

**Fix Required:**
- [ ] Audit login page at mobile breakpoints
- [ ] Fix any form field visibility issues
- [ ] Test touch targets (min 44px)
- [ ] Verify sidebar behavior on mobile

**Subagent:** `frontend-lead`

---

### L3. TODO Comments in Production Code (12 found)
**Problem:** 12 TODO/FIXME comments remain in production code, indicating unfinished work.

**Locations:**
| File | Line | Comment |
|------|------|---------|
| `components/dashboards/EmployeeDashboard.tsx` | retired | Legacy mock component deleted on 2026-03-29 |
| `components/dashboards/InternDashboard.tsx` | retired | Legacy mock component deleted on 2026-03-29 |
| `admin/probation/page.tsx` | 135 | Replace with actual API data |
| `super-admin/tasks/[id]/page.tsx` | 70 | Replace with actual API call |
| `super-admin/tasks/[id]/page.tsx` | 92 | Replace with actual API call |
| `super-admin/tasks/[id]/page.tsx` | 111 | Implement delete API call |
| `app/page.tsx` | 5 | Check authentication status and user role |
| `api/users/approve-onboarding/route.ts` | 148 | Send approval email |
| `api/users/approve-onboarding/route.ts` | 158 | Send rejection email |

**Fix:** Each TODO is covered by the checklist items above.

---

## Implementation Priority Order

### Phase 1 — Quick Wins (immediate impact)
1. **H3** — Fix probation page error handling ← `frontend-lead`
2. **H1** — Wire task detail edit ← `frontend-lead`
3. **H2** — Wire task detail delete ← `frontend-lead`

### Phase 2 — Feature Completion
4. **C6** — Department management admin page ← `frontend-lead`
5. **C7** — CSV export for directory ← `frontend-lead`
6. **H5** — Super admin dashboard telemetry integrations ← `frontend-lead`
7. **H4** — Email notifications for onboarding ← `api-architect`
8. **M4** — Profile change request emails ← `api-architect`

### Phase 3 — New Features
12. **C4** — Cron job for probation checks ← `api-architect` + `devops-engineer`
13. **C3** — Offboarding workflow ← `api-architect` + `frontend-lead`
14. **C5** — Calendar/Events feature ← `product-architect`
15. **M1** — Document approval workflow ← `supabase-schema-architect` + `frontend-lead`

### Phase 4 — Polish
16. **M2** — Bulk document operations ← `frontend-lead`
17. **M3** — Document versioning ← `supabase-schema-architect` + `frontend-lead`
18. **L1** — Advanced file filters ← `frontend-lead`
19. **L2** — Mobile responsiveness ← `frontend-lead`
20. **L3** — Clean up TODO comments ← covered by above items

---

## How to Use This Checklist

Each item specifies the recommended **subagent** to invoke. To implement:

```
@frontend-lead Implement H3: Fix probation page error handling.
Remove the fallback empty array in apps/web/src/app/(admin)/admin/probation/page.tsx,
split loading, error, and true-empty states, and add regression coverage.
```

After each implementation, re-run the audit:
```bash
npx playwright test e2e/comprehensive-feature-audit.spec.ts --project=chromium --reporter=list
```
