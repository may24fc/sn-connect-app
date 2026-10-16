# OKR/KPI Cycle Roster Task Tracker

## Current Status

The corrected historical roster rule is implemented and validated locally: former employees appear only when they have an OKR, KPI, or performance review in the exact selected cycle. Active workforce members still use the quarter-end account-creation cutoff. Migration `20261016000001` has not been applied to production. See [optimization.md](./optimization.md).

## Tasks

### Done

- [x] Require selected-quarter performance data for former employees - 2026-10-16; changed the admin performance query, Directory hook/API, and added `20261016000001_require_former_employee_quarter_data.sql`; the centralized database policy includes a former workforce account only for exact-cycle-ID OKR, KPI, or performance-review evidence, honors multi-role admins, and runs before pagination. Local migration, rollback-only SQL assertions (including parallel cycles with matching dates), web TypeScript, Directory API tests (8/8), and focused Chromium desktop/mobile verification passed.
- [x] Restore former employees to the cycle roster and their performance detail view - 2026-10-15; changed `apps/web/src/app/(app)/(admin)/admin/performance/page.tsx`, `apps/web/src/app/api/performance/individual/[employeeId]/route.ts`, and `apps/web/src/app/(app)/(admin)/admin/performance/employee/[id]/page.tsx`; validated with web TypeScript, the focused directory API suite, and mocked-auth Chromium at 1440x900 plus 390x844 dark mode.
- [x] Restrict each selected quarter to accounts created by its end date - 2026-10-15; changed `apps/web/src/hooks/useDirectory.ts`, `apps/web/src/app/api/directory/route.ts`, `packages/database/src/database.types.ts`, and `supabase/migrations/20261015000001_add_user_created_at_to_employee_directory.sql`; focused API tests verify the cutoff and invalid-date rejection; browser test verifies a later-created fixture is absent.
- [x] Add critical-flow browser coverage - 2026-10-15; added `e2e/okr-kpi-historical-roster.spec.ts`; `pnpm exec playwright test --config playwright.local.config.ts e2e/okr-kpi-historical-roster.spec.ts` passed with no console errors, failed requests, or horizontal overflow. Screenshots were reviewed from the Playwright output directory.

- [x] Validate the new view migration against local Supabase - 2026-10-15; `supabase migration up --local` applied `20261015000001` and `supabase migration list --local` lists it; `pnpm build` passed for the full monorepo and `tests/api/directory-route.test.ts` passed 6/6.
- [x] Apply `20261015000001_add_user_created_at_to_employee_directory.sql` to production - 2026-10-15; compared with the previous view definition (`20261007000004`), the only change is the appended `user_created_at` column, and `termination_reason` stays out of the view. `supabase db push --linked --dry-run` against `tccdupkjmwwxcvpqnpeb` listed only this migration; `supabase db push --linked` applied it, and `supabase migration list --linked` shows it on both sides.

### In Progress

None.

### Deferred

None.

### Skipped

- [ ] Repair the pre-existing mobile clipping of the top action row - the 390px audit shows the right edge of `Manage Cycles` clipped, but the header/action layout was not changed by this roster-correctness task; reconsider in a dedicated responsive-layout pass.

### Blocked

- [ ] Capture before/after local latency measurements - no baseline could be sampled because local Supabase was unavailable before editing; dependency: running Docker Desktop and local Supabase. Resume using commit `bf6c3ad3` in a separate baseline worktree and the commands recorded in [optimization.md](./optimization.md).

## Session History

- 2026-10-16: Corrected the prior overlap-based rule. Termination during a quarter no longer qualifies a former employee by itself; exact selected-cycle performance data is required. Applied and tested the migration locally only, confirmed the browser roster excludes a former fixture without data, and left production unchanged.
- 2026-10-15: Confirmed that the shared directory route excluded all terminated accounts and that the performance page supplied no cycle date boundary. Added an opt-in historical directory mode, account-created-through filtering, former-employee detail access, selected-cycle continuity, and focused API/browser regression coverage. Kept ordinary Directory behavior unchanged. Remaining risks are local SQL migration validation and measured query latency, both blocked by the unavailable Docker engine.
- 2026-10-15 (delivery attempt): Started Docker Desktop, validated the migration locally, full `pnpm build` and focused API tests passed. Production dry run failed (403 / no `SUPABASE_DB_PASSWORD`), so nothing was committed or pushed. Latency measurement is still outstanding.
- 2026-10-15 (production migration): Reviewed the view diff (only `user_created_at` added; grants unchanged), then the production dry run listed only `20261015000001`. Applied it to production and verified migration history. The feature code can now be committed and deployed; latency measurement is still outstanding.
