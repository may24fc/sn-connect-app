# Frontend–Backend Integration Audit — 2026-09-18

## Implementation Status — 2026-09-19

Every finding below has been acted on. Findings 11 and parts of 6 were ownership
questions rather than wiring gaps; those are recorded in
`docs/adr/ADR-007-unowned-backend-surfaces.md` and the controls behind them now
state plainly that the workflow does not exist yet.

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 1 | Resource bulk actions are dead controls | Done | `BulkUploadResourcesDialog` calls `/api/resources/bulk-upload` with per-file result reporting; Bulk Archive uses the shared `BulkRecordActionDialog` over the single-resource archive endpoint. |
| 2 | Task comments disconnected | Done | `useTaskComments` / `useCreateTaskComment` plus a shared `TaskCommentsPanel` on both task-detail pages. The route now enforces task access explicitly (`canAccessTask`) and returns 403/404 instead of an empty list. |
| 3 | Admin onboarding cannot inspect documents | Done | A Documents tab on the review page lists every upload with size and date, flags missing document types, and opens short-lived signed previews via `/api/onboarding/documents/[id]/preview`. |
| 4 | Pagination systemically incomplete | Done | Shared `ServerPagination` control on tickets (both), announcements, jobs, applications, resources, invoices and payroll approvals. The announcements, resources, tickets, jobs, applications and invoices APIs now return whole-dataset `stats`, so summary cards no longer count one page. Access dialogs show a truncation hint; the ticket-handler picker searches server-side. |
| 5 | Announcement comments backend-only | Done | `useAnnouncementComments` / `useCreateAnnouncementComment` and an `AnnouncementCommentsPanel` rendered in the announcement detail dialog. The API now enforces `allow_comments` and announcement visibility, returning 403/404 rather than relying on RLS to fail opaquely. |
| 6 | Associate/admin controls disconnected | Partly done | `Edit Profile` opens `EditInternshipDialog` (PATCH `/api/internships/[id]`); announcement Bulk Archive and Bulk Delete use `BulkRecordActionDialog`. `Generate Certificate`, `Edit Notes` and `Add Note` have no backend — see ADR-007; they now say so explicitly instead of doing nothing. |
| 7 | Expense import/reporting not exposed | Done | `ImportExpensesDialog` with template downloads and row-level error reporting, plus a monthly-report download on the admin ledger. |
| 8 | Project contributors read-only | Done | `useAddProjectContributor` / `useRemoveProjectContributor` and a `ManageContributorsDialog` for leads and supervisors, with server-side directory search. |
| 9 | Failed requests show as permanent loading | Done | New `ApiError` type carries the HTTP status; `renderQueryState` separates loading, forbidden, not-found, failed and empty. Applied to the three resource screens named below. |
| 10 | Health endpoint unconsumed | Done | The super-admin System Health card polls `/api/health` and reports current reachability, while stating plainly that historical uptime and security alerting still need a monitoring source. |
| 11 | Standups have no frontend owner | Decision pending | Recorded in ADR-007 as unowned. Needs a product answer before any frontend is built. |

### Shared building blocks introduced

- `apps/web/src/lib/api-error.ts` — `ApiError` with HTTP status, `ensureOk`, `toApiError`.
- `apps/web/src/components/feedback/QueryStateScreen.tsx` — `renderQueryState` for route-level screens. Use `renderQueryState(...)`, not `<QueryStateScreen />`, in an early-return guard: a JSX element is always truthy.
- `apps/web/src/components/data-display/ServerPagination.tsx` — range label and page controls for any `{ page, pageSize, total, totalPages }` response.
- `apps/web/src/components/admin/BulkRecordActionDialog.tsx` — select-and-apply over a per-record action, with per-record outcomes. These flows have no transactional bulk endpoint, so partial failure leaves successful records changed and the dialog says so.
- `apps/web/src/components/admin/DirectoryResultsHint.tsx` — tells an admin when they are looking at only the first page of directory matches.

### Verification

- `pnpm --filter @hr-portal/web typecheck` passes.
- Vitest: 473 passing, 28 failing across 10 files. The 28 failures are the same
  pre-existing ones this audit recorded (stale mocks, schema expectation drift,
  route-test contract failures, missing helper exports); 67 new tests were added
  for the flows connected here.
- `pnpm exec biome check` passes on every file added by this work. The repo-wide
  lint and format failures this audit recorded are untouched — fixing them means
  reformatting unrelated code, which item 9 of the implementation order tracks
  separately.

### Known limitations

- Per-page totals that have no backend aggregate are now labelled as such in the
  UI rather than presented as whole-dataset figures: resource views ("Views (this
  page)") and job open seats ("Open Seats (this page)").
- Bulk archive and bulk delete select from the records loaded on the current
  page. A transactional bulk endpoint would remove both that constraint and the
  partial-failure behaviour.
- Restoring a clean test and lint baseline (implementation order item 9) is not
  part of this pass.

---

## Purpose

This document records the current source-level audit of frontend-to-backend integration across `apps/web`. It is intended to be used as a reference and implementation backlog for other agents.

## Scope

The audit covered:

- 166 route pages under `apps/web/src/app`
- 68 frontend components under `apps/web/src/components`
- 114 hooks under `apps/web/src/hooks`
- 257 API route handlers under `apps/web/src/app/api`
- Shared UI controls consumed from `packages/ui`
- Existing unit and integration tests

This was a source-level audit. It did not include authenticated browser testing against a live database.

## Summary

The application's main feature areas are substantially connected to their backend routes. The most important remaining problems are:

1. Visible controls that have no handler or persistence behavior.
2. Existing backend features with no consuming frontend flow.
3. Paginated backend results being treated as complete datasets.
4. Query failures being presented as empty data or permanent loading states.
5. Several backend-only features with no documented frontend owner.

## Prioritized Findings

| Priority | Area | Finding |
| --- | --- | --- |
| High | Resources | Visible Bulk Upload and Bulk Archive actions do nothing. |
| High | Tasks | The comments backend exists, but neither task-detail frontend uses it. |
| High | Onboarding | Admin review does not load or preview submitted onboarding documents. |
| High | Cross-cutting | Paginated backend responses are frequently treated as complete datasets. |
| Medium | Announcements | The comments backend and `Allow comments` setting have no employee comment UI. |
| Medium | Associate management | Several visible actions have no handlers despite existing update APIs. |
| Medium | Expenses | Import, template, and monthly-report backends have no frontend. |
| Medium | Projects | Contributor mutation APIs exist, but the frontend is read-only. |
| Medium | Resources | Failed detail requests can produce permanent loading screens. |
| Low | Infrastructure | The health endpoint exists but is not consumed by the frontend. |
| Low / Unowned | Standups | A complete backend feature has no frontend route, hook, or component. |

## Detailed Findings

### 1. Resource bulk actions are dead controls

The Resources action menu renders `Bulk Upload` and `Bulk Archive` without handlers:

- `apps/web/src/app/(admin)/admin/resources/page.tsx:130`
- `apps/web/src/app/(admin)/admin/resources/page.tsx:140`

A bulk-upload backend already exists:

- `apps/web/src/app/api/resources/bulk-upload/route.ts:25`

#### Impact

The UI advertises functionality that cannot be activated. Bulk Upload is also a direct case of an existing backend capability not being connected to its intended frontend control.

#### Recommended action

- Connect Bulk Upload to `/api/resources/bulk-upload` through a mutation hook and upload dialog.
- Implement Bulk Archive by calling the existing single-resource archive operation for selected rows, or add a transactional bulk endpoint.
- Remove or disable the menu entries until the flows are functional.

### 2. Task comments are completely disconnected

The backend supports listing and creating comments, including notification delivery:

- `apps/web/src/app/api/tasks/[id]/comments/route.ts:31`
- `apps/web/src/app/api/tasks/[id]/comments/route.ts:91`

Neither task-detail screen fetches or renders comments:

- `apps/web/src/app/(employee)/tasks/[id]/page.tsx:43`
- `apps/web/src/app/(admin)/super-admin/tasks/[id]/page.tsx:98`

The in-app task tour also tells users that task comments are available, which does not match the implemented UI.

#### Impact

- Employees and task assigners cannot use an existing collaboration channel.
- Comment notifications may link recipients back to task pages that cannot show the referenced comment.
- Product guidance describes behavior the live UI does not provide.

#### Recommended action

- Add `useTaskComments` and `useCreateTaskComment` hooks.
- Add a shared task-comments panel to both employee and super-admin task-detail pages.
- Add loading, empty, error, and mutation-error states.
- Verify that comment-route authorization restricts access to users allowed to view the task.

### 3. Admin onboarding review cannot inspect uploaded documents

The frontend hook supports retrieving documents for a specified onboarding profile:

- `apps/web/src/hooks/useOnboardingDocuments.ts:15`

The backend provides authorized signed previews:

- `apps/web/src/app/api/onboarding/documents/[id]/preview/route.ts:4`

The admin onboarding-review page only fetches the profile and does not provide a documents tab or preview flow:

- `apps/web/src/app/(admin)/admin/onboarding/[id]/page.tsx:96`

#### Impact

An administrator can approve onboarding without reviewing the CV, valid ID, profile photo, or birth certificate stored by the backend.

#### Recommended action

- Call `useOnboardingDocuments(profile.id)` from the admin review page.
- Add a Documents tab with file type, filename, upload date, and preview/download actions.
- Use `/api/onboarding/documents/[id]/preview` for short-lived signed preview URLs.
- Surface unavailable, unauthorized, and preview-generation failures explicitly.

### 4. Pagination is systemically incomplete

Many pages request one large first page and then:

- Present it as the entire dataset.
- Calculate dashboard totals from `data.length`.
- Provide no way to reach later records.
- Ignore `pagination.total` and `pagination.totalPages` returned by the API.

Confirmed examples include:

- `apps/web/src/components/tickets/SuperAdminTicketsPanel.tsx:24`
- `apps/web/src/app/(employee)/tickets/page.tsx:84`
- `apps/web/src/app/(admin)/admin/announcements/page.tsx:110`
- `apps/web/src/app/(admin)/admin/jobs/page.tsx:117`
- `apps/web/src/app/(admin)/admin/jobs/applications/page.tsx:195`
- `apps/web/src/app/(admin)/admin/resources/page.tsx:67`
- `apps/web/src/app/(employee)/invoice/page.tsx:450`
- `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx:65`

Access-management dialogs are especially affected because they only load the first 100 directory users:

- `apps/web/src/components/admin/AtsAccessManagerDialog.tsx:46`
- `apps/web/src/components/admin/CrmAccessManagerDialog.tsx:57`
- `apps/web/src/components/admin/AiSpendingAccessManagerPanel.tsx:46`
- `apps/web/src/components/admin/RevenueForecastAccessManagerDialog.tsx:56`
- `apps/web/src/components/admin/MarketingAdSpendAccessManagerDialog.tsx:74`

Ticket-handler management has the same risk with a first-page limit of 200:

- `apps/web/src/components/tickets/ManageTicketHandlersDialog.tsx:34`

#### Impact

- Records beyond the hardcoded limit are inaccessible.
- Summary cards undercount data.
- Status/category breakdowns become inaccurate.
- Users outside the first directory page cannot receive feature-access grants.

#### Recommended action

- Add reusable server-pagination controls or infinite-loading behavior.
- Use `pagination.total` for unfiltered total counts.
- Add backend aggregate counts for multi-status statistic cards; these cannot be derived accurately from one page.
- Add server-side search to access-management dialogs instead of preloading only the first 100 users.

### 5. Announcement comments are implemented only on the backend

The announcement creation flow exposes an `Allow comments` setting, and the admin detail page displays whether comments are enabled.

The backend supports comment listing and creation:

- `apps/web/src/app/api/announcements/[id]/comments/route.ts:13`
- `apps/web/src/app/api/announcements/[id]/comments/route.ts:40`

There is no announcement-comments hook or employee comment component.

The backend POST route also does not currently verify the announcement's `allow_comments` value.

#### Impact

- The `allow_comments` setting has no practical frontend effect.
- Clients could post comments directly even when comments are nominally disabled.

#### Recommended action

- Add announcement comment query and mutation hooks.
- Render comments on the employee announcement detail surface when allowed.
- Enforce `allow_comments` and announcement visibility in the API route.

### 6. Associate-detail and admin actions are visible but disconnected

The following controls have no handlers:

- `Edit Profile` — `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx:286`
- `Generate Certificate` — `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx:294`
- `Edit Notes` — `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx:468`
- `Add Note` — `apps/web/src/app/(admin)/admin/probation/page.tsx:679`
- Announcement `Bulk Archive` — `apps/web/src/app/(admin)/admin/announcements/page.tsx:170`
- Announcement `Bulk Delete` — `apps/web/src/app/(admin)/admin/announcements/page.tsx:174`

The internship backend already supports PATCH updates:

- `apps/web/src/app/api/internships/[id]/route.ts:203`

Single-announcement archive and delete operations also exist and could support bulk orchestration.

#### Impact

These controls appear actionable but do nothing, which can mislead administrators into believing an operation was attempted or completed.

#### Recommended action

- Connect actions with existing mutations where backend support exists.
- Define backend ownership for certificate generation and HR notes.
- Remove or disable controls whose workflows are not scheduled for implementation.

### 7. Expense backend capabilities have no frontend

Core expense logging, matching, decisions, analytics, and exports are connected. The following capabilities are not exposed:

- CSV/XLSX import — `apps/web/src/app/api/expenses/import/route.ts:111`
- Import-template download — `apps/web/src/app/api/expenses/template/route.ts:61`
- Monthly report data/PDF — `apps/web/src/app/api/expenses/reports/monthly/route.ts:80`

The admin expense ledger currently exposes only CSV/XLSX export:

- `apps/web/src/app/(admin)/admin/expenses/page.tsx:346`

#### Recommended action

- Add an Import dialog with template-download actions and row-level result reporting.
- Add monthly-report download to the analytics or ledger page.
- If these endpoints are intentionally automation-only, document that ownership and remove them from the frontend backlog.

### 8. Project contributor management is read-only

The project detail page displays contributors:

- `apps/web/src/app/(employee)/projects/[id]/page.tsx:622`

The backend supports adding and removing contributors:

- `apps/web/src/app/api/projects/[id]/contributors/route.ts:30`
- `apps/web/src/app/api/projects/[id]/contributors/route.ts:75`

There are no corresponding frontend hooks or management controls.

#### Recommended action

- Add contributor query-key invalidation and add/remove mutation hooks.
- Add a contributor-management dialog for project leads, supervisors, and administrators.
- Display mutation failures and permission errors explicitly.

### 9. Resource failures can produce permanent loading screens

These pages do not consume the query error state and use an `isLoading || !resource`-style condition:

- `apps/web/src/app/(admin)/admin/resources/[id]/page.tsx:118`
- `apps/web/src/app/(employee)/information-hub/resources/[id]/page.tsx:154`
- `apps/web/src/app/(admin)/admin/resources/collections/[id]/page.tsx:92`

A 403, 404, or 500 therefore appears as an endless loading request.

The broader error-masking pattern also appears in activity pages, dashboards, profile queries, project screens, leaderboards, access dialogs, and auxiliary queries that destructure `data` and `isLoading` but ignore `error` or `isError`.

#### Recommended action

- Separate loading, error, not-found, forbidden, empty, and ready states.
- Add a shared query-state wrapper or convention for route-level screens.
- Do not default failed aggregate requests to valid-looking zero values.

### 10. Health endpoint is not consumed

The health endpoint exposes current status, timestamp, and version:

- `apps/web/src/app/api/health/route.ts:7`

The super-admin dashboard renders System Health as not connected:

- `apps/web/src/app/(admin)/super-admin/dashboard/page.tsx:307`

The health endpoint cannot provide historical uptime or security-alert data, but it can populate a current application-health indicator.

### 11. Standups have no frontend owner

Standups have a substantial backend surface:

- List/create — `apps/web/src/app/api/standups/route.ts:22`
- Detail/update/delete — `apps/web/src/app/api/standups/[id]/route.ts:21`
- Recording upload — `apps/web/src/app/api/standups/upload/route.ts:16`

No frontend route, hook, or component consumes these endpoints.

#### Recommended action

Decide whether standups are:

1. A planned user-facing feature that needs a route and frontend owner.
2. An automation/API-only feature that should be documented as such.
3. Legacy code that should be retired.

## Areas Substantially Connected

The following areas have functioning frontend-to-backend flows, notwithstanding the pagination and error-state concerns above:

- Authentication and password recovery
- Admin and employee dashboards
- Directory and directory export
- Employee management, probation, and offboarding
- Ticket creation, assignment, attachments, comments, and handler management
- Task CRUD and proof submissions
- Announcement CRUD, feed, read tracking, stars, attachments, and analytics
- Resource CRUD, categories, collections, bookmarks, moderation, and streaming
- Jobs and application management
- Reports and report approval
- Performance cycles, OKRs, KPIs, evidence, and evaluations
- Invoices and payroll approval
- Core expense logging, matching, decisions, analytics, and export
- AI spending
- CRM
- Projects, milestones, checklists, documentation, pool, and weekly commitments
- Notifications and notification preferences
- Calendar and Company Pulse
- AI chat and knowledge sources
- PA tasks
- Revenue forecasting
- Leaderboard, achievements, and wellness bingo

## Verification Status

At the time of the audit:

- `pnpm --filter @hr-portal/web typecheck` passed.
- Vitest completed with 406 passing and 28 failing tests across 10 failing test files.
- `pnpm exec biome check apps/web/src` failed with existing lint and formatting findings.
- The failing tests include stale mocks, schema expectation drift, route-test contract failures, and missing helper exports. They were not introduced by this audit.
- No production code was modified as part of the audit.

## Recommended Implementation Order

1. Connect or remove all visible no-op controls.
2. Add task comments to both task-detail experiences.
3. Add onboarding-document review and preview for administrators.
4. Correct pagination and aggregate-count handling across list screens and access dialogs.
5. Connect announcement comments and enforce `allow_comments` in the API.
6. Fix permanent loading and error-masking behavior.
7. Expose expense import/reporting and project contributor management.
8. Decide ownership for standups and infrastructure-health presentation.
9. Restore clean tests and lint so future integration regressions are detectable.

## Guidance for Follow-up Agents

Before implementing an item:

1. Re-run `graphify query` for the specific feature area.
2. Inspect the API route, schema, hook/query key, and all consuming pages together.
3. Preserve the current dirty worktree and avoid overwriting unrelated user changes.
4. Add loading, error, empty, success, and permission states for every new connection.
5. Add focused tests for the newly connected flow.
6. Run the web typecheck and targeted tests.
7. Run `graphify update .` after modifying code.

