# Work Tracker Task Tracker

## Current Status

The 2026-10-12 UI/UX audit has a local implementation covering clearer board scope, fairer summary metrics, risk-first roadmap, URL context, and recovery states. See [optimization.md](optimization.md) for evidence and remaining design work. The narrower Kanban interaction work remains in [../work-tracker-kanban/task-tracker.md](../work-tracker-kanban/task-tracker.md). Nothing in this session was deployed to production.

## Tasks

### Done

- [x] Audit Team Workload, Project Roadmap, Execution Board, navigation, and summary semantics - 2026-10-12; changed paths: `docs/features/work-tracker/task-tracker.md`, `docs/features/work-tracker/optimization.md`; validation: inspected the page, section navigation, shared Kanban board, task API, and Work Tracker API; compared against official Linear, Jira, Trello, and Asana documentation. No product-code validation was required for this read-only audit.
- [x] Make bounded board scope explicit and exclude cancelled tasks by default - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `apps/web/src/app/api/tasks/route.ts`, `apps/web/src/hooks/useTasks.ts`, `apps/web/src/lib/query-keys.ts`, `tests/api/tasks-route.test.ts`, `e2e/work-tracker-experience.spec.ts`; validation: focused API tests 9/9, web typecheck, browser pagination/mobile and existing Kanban interaction checks.
- [x] Clarify current workload versus period completions and Hub activity - 2026-10-12; changed paths: `apps/web/src/app/api/work-tracker/route.ts`, `apps/web/src/hooks/useWorkTracker.ts`, `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `tests/api/work-tracker-route.test.ts`; validation: focused API tests 9/9 and web typecheck. Completion counts use `completed_at`; staff order is alphabetical rather than activity-ranked.
- [x] Make roadmap and cross-view navigation more actionable - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `apps/web/src/app/api/work-tracker/route.ts`, `apps/web/src/hooks/useWorkTracker.ts`, `apps/web/src/components/work-tracker/WorkTrackerSectionNav.tsx`, `e2e/work-tracker-experience.spec.ts`; validation: focused API tests 9/9, web typecheck, browser roadmap/return-context test. The roadmap shows target date and next milestone, sorts risk-first, and offers health/owner filters.
- [x] Improve recovery and task-action friction - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `e2e/work-tracker-experience.spec.ts`; validation: web typecheck and browser filtered-empty/retry/blocker-dialog tests. Team task blockers use an in-page dialog, and Execution search queries are debounced.
- [x] Validate roadmap in the app's actual dark theme - 2026-10-12; changed path: `e2e/work-tracker-experience.spec.ts`; validation: Chromium test passed after setting the persisted theme to dark and reloading; screenshot inspected for legibility.

### In Progress

None.

### Deferred

- [ ] Add authoritative per-status board counts and per-column pagination - the current board is explicitly a ten-item page with page-local column counts; resume after agreeing an API contract and measuring query cost on local services.
- [ ] Define reward-eligible performance signals with operations/COO - completion counts are now date-correct, but no single login/activity or completion metric establishes contribution quality; resume after explicit policy and metric definitions.
- [ ] Add contextual project drilldown and employee task creation - the roadmap links to filtered execution, but does not yet expand blocked tasks or supply a create action for all employee roles; resume after role permissions and detail UX are agreed.
- [ ] Capture local before/after latency measurements - the baseline command could not complete because local services were unavailable; resume with local web and Supabase running, then run the commands in [optimization.md](optimization.md).

### Skipped

None.

### Blocked

None.

## Session History

- 2026-10-12: Reviewed all three Work Tracker views and their data contracts against official reference products. Prioritized board completeness and metric integrity before layout polish. Recorded a phased recommendation; no production or local product behavior was changed, and no latency improvement was claimed.
- 2026-10-12: Implemented the first local UI/API rollout. Validated focused API tests (9/9), web typecheck, Biome (no errors; complexity warnings), and browser board/mobile/empty/retry/navigation/blocker-dialog/dark-theme scenarios. Remaining: authoritative board counts, policy-backed rewards, contextual drilldown/creation, and local latency numbers. No production deployment or speed claim.
