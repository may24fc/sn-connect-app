# OKR/KPI Cycle Roster Task Tracker

## Current Status

Implementation and focused automated checks are complete. Local migration validation and live latency measurement are blocked because the Docker Desktop engine, and therefore local Supabase, is unavailable. See [optimization.md](./optimization.md).

## Tasks

### Done

- [x] Restore former employees to the cycle roster and their performance detail view - 2026-10-15; changed `apps/web/src/app/(app)/(admin)/admin/performance/page.tsx`, `apps/web/src/app/api/performance/individual/[employeeId]/route.ts`, and `apps/web/src/app/(app)/(admin)/admin/performance/employee/[id]/page.tsx`; validated with web TypeScript, the focused directory API suite, and mocked-auth Chromium at 1440x900 plus 390x844 dark mode.
- [x] Restrict each selected quarter to accounts created by its end date - 2026-10-15; changed `apps/web/src/hooks/useDirectory.ts`, `apps/web/src/app/api/directory/route.ts`, `packages/database/src/database.types.ts`, and `supabase/migrations/20261015000001_add_user_created_at_to_employee_directory.sql`; focused API tests verify the cutoff and invalid-date rejection; browser test verifies a later-created fixture is absent.
- [x] Add critical-flow browser coverage - 2026-10-15; added `e2e/okr-kpi-historical-roster.spec.ts`; `pnpm exec playwright test --config playwright.local.config.ts e2e/okr-kpi-historical-roster.spec.ts` passed with no console errors, failed requests, or horizontal overflow. Screenshots were reviewed from the Playwright output directory.

- [x] Validate the new view migration against local Supabase - 2026-10-15; `supabase migration up --local` applied `20261015000001` and `supabase migration list --local` lists it; `pnpm build` passed for the full monorepo and `tests/api/directory-route.test.ts` passed 6/6.

### In Progress

None.

### Deferred

None.

### Skipped

- [ ] Repair the pre-existing mobile clipping of the top action row - the 390px audit shows the right edge of `Manage Cycles` clipped, but the header/action layout was not changed by this roster-correctness task; reconsider in a dedicated responsive-layout pass.

### Blocked

- [ ] Apply `20261015000001_add_user_created_at_to_employee_directory.sql` to production - blocked 2026-10-15: `supabase db push --linked --dry-run` against `tccdupkjmwwxcvpqnpeb` failed with a 403 on login-role initialisation and `SUPABASE_DB_PASSWORD` is not set. Resume by exporting `SUPABASE_DB_PASSWORD` (or re-authenticating with an account that has database access), rerun the dry run, confirm only this migration is listed, then push and verify with `supabase migration list --linked`. Note: `supabase db push` in CLI v1.226.4 has no `--project-ref` flag; use `--linked` (the repo is linked to the production ref). Code in this feature depends on the new view column, so do not commit/push it before the migration is applied.
- [ ] Capture before/after local latency measurements - no baseline could be sampled because local Supabase was unavailable before editing; dependency: running Docker Desktop and local Supabase. Resume using commit `bf6c3ad3` in a separate baseline worktree and the commands recorded in [optimization.md](./optimization.md).

## Session History

- 2026-10-15: Confirmed that the shared directory route excluded all terminated accounts and that the performance page supplied no cycle date boundary. Added an opt-in historical directory mode, account-created-through filtering, former-employee detail access, selected-cycle continuity, and focused API/browser regression coverage. Kept ordinary Directory behavior unchanged. Remaining risks are local SQL migration validation and measured query latency, both blocked by the unavailable Docker engine.
- 2026-10-15 (delivery attempt): Started Docker Desktop, validated the migration locally, full `pnpm build` and focused API tests passed. Production dry run failed (403 / no `SUPABASE_DB_PASSWORD`), so nothing was committed or pushed. Latency measurement is still outstanding.
