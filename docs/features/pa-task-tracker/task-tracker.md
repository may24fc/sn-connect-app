# PA Task Tracker Task Tracker

## Current Status

Quick Add and the filter bar were simplified to reduce cognitive load. Typechecked; not yet visually verified in a signed-in browser.

## Tasks

### Done
- [x] Replace the 8-field Quick Add card with a one-line composer - 2026-10-06; changed `apps/web/src/app/(app)/(employee)/pa-tasks/page.tsx`; validated with `pnpm --filter web typecheck` (page clean) and the Impeccable detector (no findings). Title + Assignee + Due + Add; Enter submits; status/priority come from lookup defaults; date given is stamped with the local date on submit (previously UTC, which could record yesterday before 8am in UTC+8). No validation error is shown on an empty form; Add is disabled until a title exists. "Add with full details" opens the existing Create panel carrying title, assignee, and due date. Category and notes moved to that panel only.
- [x] "Add person…" entry in the composer's assignee list for PA managers - 2026-10-06; same file. Opens the existing Grant Access dialog. Assignees remain data-driven from `pa_task_access_grants` (`/api/pa-tasks/bootstrap`); no names are hard-coded.
- [x] Replace the 7-select Filters card with a toolbar on the table card - 2026-10-06; same file. Search, then Status / Priority / Assignee / Category / Due filters that read as their name when unset and "Name: Value" with a highlighted border when set; "Clear N filters" appears only when filters are active; sort sits at the right with plain labels (Recently updated / Due soonest / Due latest).

- [x] Remove the header "New Task" button - 2026-10-06; same file; typechecked. The composer is the single create entry; its "Add with full details" link opens the full Create panel. Archive view had no create button before and still has none.
- [x] Move the filter controls into the shared `apps/web/src/components/data-display/FilterControls.tsx` - 2026-10-06; pa-tasks now imports `FilterSelect`, `FilterSearchInput`, `ClearFiltersButton`; rollout to other pages is tracked in [compact-filter-toolbar](../compact-filter-toolbar/task-tracker.md).

### In Progress

None.

### Deferred
- [ ] Visual verification at desktop and mobile widths - Deferred: `playwright-auth.json` (2026-09-18) is expired and redirects to /login. Resume: sign in locally, refresh the storage state, and screenshot `/pa-tasks` at 1440px and 390px, including an active filter and a typed composer.

### Skipped

None.

### Blocked

None.

## Session History
- 2026-10-06 (later): Removed the redundant header "New Task" button at the user's request and extracted the filter controls for reuse.
- 2026-10-06: Distilled Quick Add and filters after a request to make the page less mentally taxing. User chose the one-line composer and compact toolbar options. Decisions: quick-add mutation stays server-confirmed (behavior unchanged); category/notes removed only from the inline composer, still available in the full form. Context: an admin asked for a new Admin Associate Intern to appear in "Assigned To"; that is done through Grant Access (the person needs an employee/associate account), now also reachable from the assignee list. Known risk: unrelated uncommitted edits in the working tree (including a duplicate JSX attribute in `bingo/page.tsx` that currently fails `pnpm --filter web typecheck`) were not touched.
