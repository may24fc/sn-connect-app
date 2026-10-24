# Work Tracker Task Tracker

## Current Status

The Work Tracker now has a production-ready department-lead management model: super-admins appoint eligible department leads; leads can manage work only for their current department; projects can add departments through an invitation/acceptance flow; and milestone completion awards XP once using completed-task contribution. Department leads see department work data without administrator-only Hub activity. See [optimization.md](optimization.md) for the authorization and reward-flow record. The narrower Kanban interaction work remains in [../work-tracker-kanban/task-tracker.md](../work-tracker-kanban/task-tracker.md). Both department-lead migrations were applied and verified in local and production Supabase on 2026-10-20.

## Tasks

### Done

- [x] Break the recursive `projects` / `project_contributors` RLS policies - 2026-10-24; added `supabase/migrations/20261025000003_break_project_policy_recursion.sql` and `tests/sql/project-rls-recursion-local.sql`. `projects_select_member_policy` queried `project_contributors`, whose FOR ALL `project_contributors_modify_lead_policy` queried `projects`, so every RLS-scoped read of `projects`, `project_contributors`, or `project_documentations` failed with `infinite recursion detected in policy` (admins and employees alike). Both policies now call `SECURITY DEFINER` helpers `user_is_project_contributor` and `user_leads_project` (execute revoked from `anon`); access rules are unchanged. App routes were not affected in practice because every project read uses the admin client. Validation: before the fix, local RLS probes errored on all three tables; after, they return rows. The SQL test passes, covering lead read and contributor add, contributor read without add rights, loss of access after removal, admin read, and no anon execute. Applied with `pnpm db:migrate:local`, then to production after an explicit user request (dry run listed exactly `20261025000002` and `20261025000003`); production migration history verified.
- [x] Audit Team Workload, Project Roadmap, Execution Board, navigation, and summary semantics - 2026-10-12; changed paths: `docs/features/work-tracker/task-tracker.md`, `docs/features/work-tracker/optimization.md`; validation: inspected the page, section navigation, shared Kanban board, task API, and Work Tracker API; compared against official Linear, Jira, Trello, and Asana documentation. No product-code validation was required for this read-only audit.
- [x] Make bounded board scope explicit and exclude cancelled tasks by default - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `apps/web/src/app/api/tasks/route.ts`, `apps/web/src/hooks/useTasks.ts`, `apps/web/src/lib/query-keys.ts`, `tests/api/tasks-route.test.ts`, `e2e/work-tracker-experience.spec.ts`; validation: focused API tests 9/9, web typecheck, browser pagination/mobile and existing Kanban interaction checks.
- [x] Clarify current workload versus period completions and Hub activity - 2026-10-12; changed paths: `apps/web/src/app/api/work-tracker/route.ts`, `apps/web/src/hooks/useWorkTracker.ts`, `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `tests/api/work-tracker-route.test.ts`; validation: focused API tests 9/9 and web typecheck. Completion counts use `completed_at`; staff order is alphabetical rather than activity-ranked.
- [x] Make roadmap and cross-view navigation more actionable - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `apps/web/src/app/api/work-tracker/route.ts`, `apps/web/src/hooks/useWorkTracker.ts`, `apps/web/src/components/work-tracker/WorkTrackerSectionNav.tsx`, `e2e/work-tracker-experience.spec.ts`; validation: focused API tests 9/9, web typecheck, browser roadmap/return-context test. The roadmap shows target date and next milestone, sorts risk-first, and offers health/owner filters.
- [x] Improve recovery and task-action friction - 2026-10-12; changed paths: `apps/web/src/app/(app)/(employee)/work-tracker/page.tsx`, `e2e/work-tracker-experience.spec.ts`; validation: web typecheck and browser filtered-empty/retry/blocker-dialog tests. Team task blockers use an in-page dialog, and Execution search queries are debounced.
- [x] Validate roadmap in the app's actual dark theme - 2026-10-12; changed path: `e2e/work-tracker-experience.spec.ts`; validation: Chromium test passed after setting the persisted theme to dark and reloading; screenshot inspected for legibility.
- [x] Add department-lead appointments and strict department-scoped work permissions - 2026-10-20; changed paths: `supabase/migrations/20261020000001_department_leads_and_work_management.sql`, `apps/web/src/lib/work-management/permissions.ts`, project/task/Work Tracker API routes, Directory UI, hooks and database types; validation: local migrations applied, local database reward transaction rolled back after assertions, web typecheck passed, and focused API tests passed 13/13.
- [x] Add mutually approved cross-department project membership - 2026-10-20; changed paths: `apps/web/src/app/api/projects/[id]/departments/route.ts`, `apps/web/src/components/projects/ManageProjectDepartmentsDialog.tsx`, project access helpers and detail page; validation: focused API/type checks plus Chromium project dialog checks at desktop and mobile widths.
- [x] Replace automatic milestone approval with explicit completion and deterministic XP distribution - 2026-10-20; changed paths: both 2026-10-20 migrations, milestone submission/checklist routes, project hook/detail page and milestone badge; validation: local SQL transaction proved a 2:1 completed-task split produces 100/50 XP and a repeat completion creates no duplicate reward.
- [x] Give department leads a privacy-safe Work Tracker team view - 2026-10-20; changed paths: Work Tracker API/hook/page, `tests/api/work-tracker-route.test.ts`, `e2e/department-lead-work-tracker.spec.ts`; validation: Chromium desktop 1440x900 and mobile 390x844 screenshots inspected, department scope rendered, Hub-activity columns absent, and the focused test passed.
- [x] Apply and verify the department-lead migrations in production - 2026-10-20; migrations `20261020000000_add_completed_milestone_status.sql` and `20261020000001_department_leads_and_work_management.sql`; validation: production dry-run listed exactly those files, `db push --linked` applied both, and `migration list --linked` showed matching local and remote versions for project `tccdupkjmwwxcvpqnpeb`.

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

- 2026-10-24: Found during the Ask AI reflections work and fixed at the user's request: the project RLS policies recursed through each other since `20260507000003_create_project_rls.sql`. Replaced the cross-table EXISTS checks with SECURITY DEFINER membership helpers and added a rolled-back SQL test. Production received the migration together with the performance policy fix.
- 2026-10-12: Reviewed all three Work Tracker views and their data contracts against official reference products. Prioritized board completeness and metric integrity before layout polish. Recorded a phased recommendation; no production or local product behavior was changed, and no latency improvement was claimed.
- 2026-10-12: Implemented the first local UI/API rollout. Validated focused API tests (9/9), web typecheck, Biome (no errors; complexity warnings), and browser board/mobile/empty/retry/navigation/blocker-dialog/dark-theme scenarios. Remaining: authoritative board counts, policy-backed rewards, contextual drilldown/creation, and local latency numbers. No production deployment or speed claim.
- 2026-10-20: Implemented the approved department-lead capability locally. Chose multiple leads per department, canonical-department eligibility, server-confirmed governance mutations, mutual approval for shared projects, privacy-safe department reporting, explicit milestone completion, and an exactly-once weighted XP ledger. Local migration and reward checks, 13 focused API tests, web typecheck, and five focused Chromium scenarios passed after correcting one test route-order issue. Production migration remains deferred pending explicit authorization.
- 2026-10-20: After an initial production pooler timeout, a requested retry succeeded. The dry-run identified only the two intended migrations; both were applied to production project `tccdupkjmwwxcvpqnpeb`, and the linked migration ledger verified both versions.
