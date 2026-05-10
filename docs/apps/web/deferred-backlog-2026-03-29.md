# Apps/Web Deferred Backlog - 2026-03-29

This file contains work that should not be mixed into the immediate `apps/web` action list. These items are real, but they are lower urgency than the live blockers and workflow issues captured in `docs/apps-web-audit-2026-03-29.md`.

## Defer Until After Current Fixes

### 1. Legacy dashboard exports retired on 2026-03-29

- Completed cleanup:
  - `apps/web/src/components/dashboards/EmployeeDashboard.tsx`
  - `apps/web/src/components/dashboards/InternDashboard.tsx`
  - `apps/web/src/components/dashboards/index.ts`
- Outcome:
  - The unused mock dashboard layer was deleted.
  - The live route pages remain the single source of truth.

### 2. Build department-management UI if the team still wants in-app ownership

- Existing API: `apps/web/src/app/api/departments/route.ts`
- No current page route exists for department administration.
- Reason deferred:
  - This is a feature expansion, not a broken existing page.

### 3. Implement real telemetry behind the super-admin observability cards

- File: `apps/web/src/app/(admin)/super-admin/dashboard/page.tsx`
- Deferred scope:
  - Security alerting.
  - System health / uptime / monitoring widgets.
- Reason deferred:
  - The dashboard now uses explicit not-connected states, so the remaining work is integration with alerting and observability sources rather than UI cleanup.

### 4. Decide long-term ownership of offboarding UI surface area

- Current state:
  - Offboarding exists as API routes and checklist-driven UI.
  - There is no dedicated `/admin/offboarding` page route.
- Reason deferred:
  - The workflow is no longer missing, so this is now a product/IA decision, not an implementation blocker.

### 5. Formalize offer-letter generation instead of placeholder rendering

- File: `apps/web/src/app/(admin)/admin/jobs/applications/page.tsx`
- Reason deferred only if the current sprint chooses to hide the placeholder instead of implementing generation now.
- Follow-up scope:
  - Template management.
  - Signature/approval handoff.
  - Persistence and audit logging.

## Testing Backlog

### 1. Raise component test coverage above the current single-test baseline

- Current component coverage under `tests/components` is only `PhoneInput.test.tsx`.
- Candidate targets after the immediate bug fixes:
  - EmptyState variants.
  - Task detail interactions.
  - Probation dashboard states.
  - CompanyPulseWidget fallback/configured states.

### 2. Expand route and hook coverage around newer admin surfaces

- Good candidates:
  - `useRecentActivity`
  - `useProbation`
  - `useTasks`
  - offboarding hooks and task mutations
  - directory export smoke coverage for CSV and XLSX

### 3. Add responsive and accessibility regression coverage

- Existing E2E coverage is stronger on auth, onboarding, announcements, and resources than on responsive behavior across admin pages.
- Follow-up targets:
  - probation page on narrow widths
  - jobs application slide panels
  - super-admin dashboard placeholder/fallback states
  - empty-state and icon-button accessibility checks

## Documentation Backlog

### 1. Retire or refresh stale audit entries

- Older docs still mention missing features that now exist in source.
- Update or annotate older checklists so future sessions do not reopen already-implemented work.

### 2. Document canonical UI ownership for shared patterns

- Needed decisions:
  - where EmptyState lives
  - where skeleton variants live
  - whether admin dialogs belong in `apps/web` or should be promoted into `packages/ui`

## Explicitly Removed From Immediate Backlog

These were validated as already implemented in current source and should not be treated as open “build it now” items without new evidence.

- Offboarding API existence.
- Probation cron route existence.
- Calendar events API existence.
- Manager team-performance route existence.
- Employee directory CSV/XLSX export existence.

## Revisit Criteria

Move a deferred item back into the immediate queue only if one of the following becomes true:

- It is blocking an active HR/admin flow this sprint.
- Stakeholders need it for production operations now.
- A placeholder surface is confusing users enough that it should be removed or replaced immediately.
- New test or runtime evidence shows the current “defer” decision is wrong.