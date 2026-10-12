# Work Tracker Kanban Task Tracker

## Current Status

Interactive status moves are implemented locally, the full card is now the drag target, and the flow is covered by Chromium Playwright tests. Local latency measurement remains deferred because the local Supabase stack is unavailable. See [optimization.md](optimization.md).

## Tasks

### Done

- [x] Make the full task card draggable while preserving its detail link and Move menu - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `e2e/work-tracker-kanban.spec.ts`; validation: focused Biome check, web typecheck, and Chromium Playwright 3/3 using an isolated Next.js cache. Browser audit covered employee whole-card drag at desktop width, the 390px responsive layout and touch-friendly Move menu, keyboard/blocker handling, optimistic rollback, console errors, failed requests, and inspected desktop/mobile screenshots.
- [x] Add a dedicated drag handle, visible drop targets, and an accessible Move menu - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`; validated by Chromium Playwright drag and keyboard tests, focused Biome checks, and an earlier web typecheck.
- [x] Require a blocker reason through an in-page dialog and propagate it from employee task pages - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `apps/web/src/app/(app)/(employee)/tasks/page.tsx`; validated by Chromium Playwright API-payload assertion and an earlier web typecheck.
- [x] Surface failed moves and preserve rollback behavior across task boards - 2026-10-12; `apps/web/src/components/tasks/TaskKanbanBoard.tsx`, `apps/web/src/app/(app)/(employee)/tasks/page.tsx`, `apps/web/src/app/(app)/(admin)/super-admin/tasks/page.tsx`; validated by Chromium Playwright failure test and an earlier web typecheck.
- [x] Add focused browser coverage and isolate the Playwright Next.js build - 2026-10-12; `e2e/work-tracker-kanban.spec.ts`, `scripts/playwright/start-playwright-web.js`; drag and keyboard tests passed together, then the final rollback/error-banner test passed separately after its locator was refined. Focused Biome and Node syntax checks passed.

### In Progress

None.

### Deferred

- [ ] Record before/after latency numbers - local Supabase Auth at `127.0.0.1:55321` is unavailable and Docker Desktop's Linux engine is not running; resume when the local Supabase stack and local web server are available, then run the commands in [optimization.md](optimization.md). No performance improvement is claimed.
- [ ] Restore a clean whole-web typecheck - a later check failed on three unused declarations in the concurrently changed `MarketingAdSpendDashboard.tsx`, unrelated to this board; resume after that separate work is reconciled, then rerun `pnpm --filter @hr-portal/web typecheck`.
- [ ] Persist manual ordering within a status column - current status-mutation API does not support a card order field, so a local-only visual reorder would be misleading; revisit when order storage and multi-user conflict rules are specified.

### Skipped

None.

### Blocked

None.

## Session History

- 2026-10-12: Replaced the handle-only drag activator with a full-card drag target after direct user feedback showed the small six-dot target was awkward. Kept the grip as an affordance, preserved the detail link and accessible Move menu, and passed the focused desktop/mobile Chromium audit plus typecheck and formatting checks. Trello and Asana board guidance both describe moving cards/tasks directly by dragging the card/task.
- 2026-10-12: Used Trello's documented drag-and-move interactions as a reference. Implemented status dragging, keyboard-accessible move actions, blocker dialog, and failed-move feedback. Three Chromium Playwright tests passed in an initial complete run. After adding visible error feedback, drag and keyboard tests passed together and the final rollback test passed separately. The launcher now respects an isolated `NEXT_DIST_DIR`, avoiding the shared Next.js cache. An earlier web typecheck passed, but a later run found unrelated concurrent marketing-dashboard errors. Local latency measurements could not run without Supabase/Docker; persistent in-column ordering remains deferred.
