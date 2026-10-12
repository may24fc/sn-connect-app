# Work Tracker Kanban Task Tracker

## Current Status

Interactive status moves now show the exact insertion position, persist card order through the existing task `position` field, and allow an immediate follow-up drag while the prior save is still pending. The flow is covered by focused hook and Chromium Playwright tests. Local latency measurement remains deferred because the local app is unavailable at the benchmark URL. See [optimization.md](optimization.md).

## Tasks

### Done

- [x] Add a card-height insertion gap and persist the selected destination order - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, task API/schema/hooks, and board hosts; validation: web typecheck, focused optimistic-order test, and Chromium insertion-position test.
- [x] Remove the post-drop interaction lock while preserving ordered server writes and safe rollback - 2026-10-12; `apps/web/src/hooks/useUpdateTask.ts`, `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, and tests; validation: 4/4 focused hook tests and Chromium delayed-PATCH second-drag coverage.
- [x] Make the full task card draggable while preserving its detail link and Move menu - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `e2e/work-tracker-kanban.spec.ts`; validation: focused Biome check, web typecheck, and Chromium Playwright 3/3 using an isolated Next.js cache. Browser audit covered employee whole-card drag at desktop width, the 390px responsive layout and touch-friendly Move menu, keyboard/blocker handling, optimistic rollback, console errors, failed requests, and inspected desktop/mobile screenshots.
- [x] Add a dedicated drag handle, visible drop targets, and an accessible Move menu - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`; validated by Chromium Playwright drag and keyboard tests, focused Biome checks, and an earlier web typecheck.
- [x] Require a blocker reason through an in-page dialog and propagate it from employee task pages - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `apps/web/src/app/(app)/(employee)/tasks/page.tsx`; validated by Chromium Playwright API-payload assertion and an earlier web typecheck.
- [x] Surface failed moves and preserve rollback behavior across task boards - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `apps/web/src/app/(app)/(employee)/tasks/page.tsx`, `apps/web/src/app/(app)/(admin)/super-admin/tasks/page.tsx`; validated by Chromium Playwright failure test and an earlier web typecheck.
- [x] Add focused browser coverage and isolate the Playwright Next.js build - 2026-10-12; `e2e/work-tracker-kanban.spec.ts`, `scripts/playwright/start-playwright-web.js`; drag and keyboard tests passed together, then the final rollback/error-banner test passed separately after its locator was refined. Focused Biome and Node syntax checks passed.
- [x] Complete release validation for the Kanban interaction update - 2026-10-12; no database migrations added; `pnpm --filter @hr-portal/web typecheck` and the full monorepo `pnpm build` passed.

### In Progress

None.

### Deferred

- [ ] Record before/after latency numbers - both required runs failed because the local app was unavailable at `http://localhost:3001`; resume when the local Supabase stack and web server are available, then run the commands in [optimization.md](optimization.md). No measured speed improvement is claimed.

### Skipped

None.

### Blocked

None.

## Session History

- 2026-10-12: Corrected the earlier ordering assessment after confirming `tasks.position` already exists. Added precise insertion feedback, persisted visible destination order, and removed the global pending lock. Same-task PATCH requests are serialized while optimistic intent remains immediate; stale failures cannot roll back a newer move. Validation passed with web typecheck, the full monorepo production build, 4/4 hook tests, and all four Chromium Kanban scenarios across focused runs. The migration gate was clear. Local before/after latency sampling could not connect to `localhost:3001`, so no numeric speed claim is made.
- 2026-10-12: Replaced the handle-only drag activator with a full-card drag target after direct user feedback showed the small six-dot target was awkward. Kept the grip as an affordance, preserved the detail link and accessible Move menu, and passed the focused desktop/mobile Chromium audit plus typecheck and formatting checks. Trello and Asana board guidance both describe moving cards/tasks directly by dragging the card/task.
- 2026-10-12: Used Trello's documented drag-and-move interactions as a reference. Implemented status dragging, keyboard-accessible move actions, blocker dialog, and failed-move feedback. Three Chromium Playwright tests passed in an initial complete run. After adding visible error feedback, drag and keyboard tests passed together and the final rollback test passed separately. The launcher now respects an isolated `NEXT_DIST_DIR`, avoiding the shared Next.js cache. An earlier web typecheck passed, but a later run found unrelated concurrent marketing-dashboard errors. Local latency measurements could not run without Supabase/Docker; persistent in-column ordering remains deferred.
