# Apps/Web Audit - 2026-03-29

## Scope

- Surface reviewed: `apps/web` pages, layouts, app-specific components, shared UI components consumed by web, route handlers that directly support web flows, and current tests/docs coverage.
- Inventory baseline used for this audit: 95 route pages under `apps/web/src/app`, 29 app-specific components under `apps/web/src/components`, existing audit docs, current route/component source, and current test coverage in `tests` and `e2e`.
- Verification baseline: `pnpm typecheck` is currently passing for the repo and `get_errors` returned no active editor errors for `apps/web`.

## Triage Rules

Items are in `Now` only if they are one of the following:

- Broken or stubbed user-facing behavior on a live page.
- Live routing or access behavior that sends users to the wrong flow.
- Production UI that masks backend failures or presents incomplete data as valid state.
- High-impact workflow gaps in active admin/employee flows.
- Structural drift that is already creating inconsistent UX or code ownership confusion.

Everything else is moved to the deferred backlog in `docs/apps-web-deferred-backlog-2026-03-29.md`.

## Current Findings

### 1. Fix Now

#### A. Super-admin task detail page is still partially fake

- File: `apps/web/src/app/(admin)/super-admin/tasks/[id]/page.tsx`
- Evidence:
  - `handleStatusChange` only mutates local state and contains `// TODO: Replace with actual API call`.
  - `handleEdit` is an empty function.
  - `handleDelete` only shows a confirm dialog, emits a success toast, and redirects without deleting anything.
- Why this is `Now`:
  - This is a live admin workflow page with visible controls that imply persistence but do not actually persist changes.
  - It creates direct behavioral regressions for task management and can mislead admins into thinking updates were saved.
- Required action:
  - Wire status updates to the task mutation endpoint.
  - Either implement edit properly or remove the button until editing exists.
  - Wire delete to the actual delete endpoint and only redirect on success.
  - Add tests for edit/status/delete behavior.

#### B. Admin probation page still hides failures behind a hardcoded fallback

- File: `apps/web/src/app/(admin)/admin/probation/page.tsx`
- Evidence:
  - The file still defines `const employees: Array<Employee> = [];` with `// TODO: Replace with actual API data`.
  - The live page uses `const employeeRecords = probationPayload?.data?.length ? probationPayload.data : employees;`.
- Why this is `Now`:
  - The page silently degrades to an empty success-looking state when the API fails or returns no records.
  - This distorts a core HR review screen and can hide operational issues.
- Required action:
  - Remove the hardcoded fallback array.
  - Split loading, API error, and true empty-state behavior explicitly.
  - Add a regression test for failed probation fetches and empty payloads.

#### C. Root route still ignores session and role state

- File: `apps/web/src/app/page.tsx`
- Evidence:
  - The root page has `// TODO: Check authentication status and user role` and unconditionally `redirect('/login')`.
- Why this is `Now`:
  - Any authenticated user landing on `/` is sent to login instead of their actual entry route.
  - This is routing debt on the public entrypoint, not background cleanup.
- Required action:
  - Resolve the current session at the root route and redirect by role.
  - Align the redirect behavior with existing middleware/auth rules.
  - Add route coverage for authenticated root access.

#### D. Offer-letter flow in job applications is still a placeholder-only surface

- File: `apps/web/src/app/(admin)/admin/jobs/applications/page.tsx`
- Evidence:
  - The panel contains an explicit `OFFER LETTER PLACEHOLDER VIEW` section.
  - The copy states: `This is a placeholder offer letter. The actual offer letter template will be configured by HR.`
- Why this is `Now`:
  - This sits inside an active recruitment flow and presents a visible next-step surface after approval.
  - If recruitment is active, the workflow stops at a non-functional placeholder.
- Required action:
  - Decide immediately between implementing the real offer-letter handoff or removing the placeholder panel from the approval flow until the real feature exists.

#### E. Empty state implementation has drifted across three layers

- Files:
  - `apps/web/src/components/feedback/EmptyState.tsx`
  - `apps/web/src/components/data-display/EmptyState.tsx`
  - `packages/ui/src/components/empty-state.tsx`
- Evidence:
  - The app-level feedback version supports size variants, primary/secondary actions, and table/card wrappers.
  - The shared UI version uses a different shape, layout, icon contract, and visual treatment.
  - The web app also carries a second local EmptyState surface under `data-display`.
- Why this is `Now`:
  - This is already causing inconsistent empty/error UI patterns across pages.
  - It increases maintenance cost for a pattern that should be centralized.
- Required action:
  - Pick one canonical empty-state API.
  - Either promote the app-level version into `packages/ui` or collapse web usage onto the shared package version.
  - Remove duplicate local surfaces after migration.

#### F. Critical coverage is still thin where the current risks are highest

- Evidence:
  - Component test coverage under `tests/components` is currently only `tests/components/PhoneInput.test.tsx`.
  - There are no focused tests covering `useRecentActivity`, `useProbation`, `useTasks`, or the super-admin task detail behavior.
  - E2E coverage exists for auth, onboarding, resources, announcements, and general UI audit, but not for the live gaps above.
- Why this is `Now`:
  - The highest-risk live issues are on pages that currently do not have targeted regression coverage.
- Required action:
  - Add at minimum one targeted regression suite for super-admin task detail behavior.
  - Add probation-page loading/error/empty-state coverage.
  - Add a root-route redirect test for authenticated access.

### 2. Clean Up Soon

These items are real, but they do not belong ahead of the `Fix Now` list.

#### A. Legacy dashboard components still ship mock data and should be removed or reconciled

- Files:
  - `apps/web/src/components/dashboards/EmployeeDashboard.tsx`
  - `apps/web/src/components/dashboards/InternDashboard.tsx`
  - `apps/web/src/components/dashboards/index.ts`
- Evidence:
  - Both component files still contain explicit mock values and `TODO` comments.
  - Current live route pages at `apps/web/src/app/(employee)/dashboard/page.tsx` and `apps/web/src/app/(employee)/intern/dashboard/page.tsx` already use real hooks and live data paths.
  - Grep results show the mock components are only exported from the local barrel and are not used by the route pages.
- Action:
  - Remove these dead exports or rewrite them as wrappers around the real route-level implementations.

#### B. Super-admin dashboard still contains placeholder sections

- File: `apps/web/src/app/(admin)/super-admin/dashboard/page.tsx`
- Evidence:
  - `securityAlerts` and `systemHealth` are both hardcoded empty arrays with comments stating they remain placeholder until future systems exist.
- Action:
  - Either remove placeholder sections from the dashboard or replace them with clearly labeled coming-soon cards that do not pretend to be live metrics.

#### C. Department management still has API support but no page-level UI

- Evidence:
  - `apps/web/src/app/api/departments/route.ts` exists.
  - No route-page surface under `apps/web/src/app/**/departments/**` exists.
- Action:
  - If department administration is expected in-app, build an admin page and navigation entry.
  - If not, document API-only ownership and remove the expectation from UI backlog conversations.

#### D. Directory export has been implemented, but the old backlog should be updated to stop re-triaging it

- Evidence:
  - `apps/web/src/hooks/useDirectory.ts` supports both CSV and XLSX export.
  - `apps/web/src/app/api/directory/export/route.ts` implements both formats.
  - `apps/web/src/app/(admin)/admin/directory/page.tsx` exposes both export actions.
- Action:
  - Remove export from older unresolved audit lists.
  - Keep only verification tasks such as export smoke tests for large mixed datasets.

#### E. Older audit docs still contain stale “missing feature” findings

- Evidence verified as already implemented in current source:
  - Offboarding API exists under `apps/web/src/app/api/offboarding`.
  - Probation cron route exists at `apps/web/src/app/api/cron/probation-check/route.ts`.
  - Calendar events API exists at `apps/web/src/app/api/calendar/events/route.ts`.
  - Manager team performance route exists at `apps/web/src/app/(employee)/manager/team-performance/page.tsx`.
- Action:
  - Treat March audit files as seed input only.
  - Update future planning against current source, not against the older checklist verbatim.

## Feature-Area Summary

### Healthy or substantially implemented

- Employee dashboard route uses real hooks for onboarding, probation, tasks, announcements, milestones, and company pulse.
- Intern dashboard route uses real internship hooks, report submission, and setup redirection.
- Directory export is already implemented for CSV and XLSX.
- Company calendar / Company Pulse is wired via `/api/calendar/events` and `useCompanyPulse`.
- Offboarding is no longer “missing”; it exists as API and checklist-driven UI surfaces.

### Needs focused follow-up after the `Now` list

- Recruitment offer-letter flow.
- Department administration UX.
- Placeholder-only super-admin observability widgets.
- Consolidation of duplicate UI patterns.
- Removal of dead dashboard component exports.

## Recommended Execution Order

1. Wire super-admin task detail mutations and remove fake success behavior.
2. Fix admin probation page state handling so failures are visible.
3. Fix root-route session-aware redirect behavior.
4. Decide recruitment offer-letter behavior: implement or remove placeholder.
5. Consolidate EmptyState pattern ownership.
6. Add regression coverage for the changes above.

## Notes

- This audit intentionally does not duplicate every historical backlog item. It normalizes current-source findings only.
- Deferred or non-immediate work is tracked separately in `docs/apps-web-deferred-backlog-2026-03-29.md`.