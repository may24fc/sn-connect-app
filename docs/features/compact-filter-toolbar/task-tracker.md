# Compact Filter Toolbar Task Tracker

## Current Status

The PA Task Tracker filter pattern (one toolbar row, no label row, active filters highlighted, clear button only when something is active) is now a shared component and applied to the expense and performance-review screens that used labelled filter cards. Typechecked; not visually verified in a signed-in browser.

## Tasks

### Done
- [x] Shared controls - 2026-10-06; added `apps/web/src/components/data-display/FilterControls.tsx`: `FilterSelect` (reads as its name when unset, "Name: Value" + highlight when set; `allValue={null}` for always-set scope selectors), `FilterDateInput` (date/month with inline label; `isScope` disables the active highlight; optional `inputRef`/`onInputClick`), `FilterSearchInput`, `ClearFiltersButton` (renders only when count > 0). Validated with `pnpm --filter web exec tsc --noEmit` (no errors in changed files) and the Impeccable detector.
- [x] PA Task Tracker - 2026-10-06; `apps/web/src/app/(app)/(employee)/pa-tasks/page.tsx`. See [pa-task-tracker](../pa-task-tracker/task-tracker.md).
- [x] Expenses ledger filters - 2026-10-06; `apps/web/src/app/(app)/(admin)/admin/expenses/page.tsx`. "Ledger Filters" card replaced by a toolbar (search vendor, Department, State, From, To, clear). Export CSV / Export XLSX / Monthly Report merged into one "Export" menu; Import stays a button. Clear now also counts the search term.
- [x] Expense analytics filters - 2026-10-06; `apps/web/src/app/(app)/(admin)/admin/expenses/analytics/page.tsx`. "Context Filters" card replaced by a toolbar; Week/Month became a segmented "By week / By month" toggle (`aria-pressed`).
- [x] Performance review screens - 2026-10-06; `apps/web/src/components/performance/{MonthlySelfEvaluation,QuarterlyTemperatureCheck,MonthlyCallFeedback,FivePercentReflection}AdminReview.tsx`. Label rows removed; Month/Quarter render as scope controls (never highlighted); Department / role and search use the shared controls. Title cards, descriptions, and AI summary actions unchanged. Month picker click-to-open behavior preserved on the monthly self-evaluation screen.

### In Progress

None.

### Deferred
- [ ] Visual verification at desktop and mobile widths - Deferred: `playwright-auth.json` is expired (redirects to /login). Resume: refresh the storage state and screenshot each page above with one filter active.

### Skipped
- [ ] One-line composer for other inline create forms - Skipped: CRM lead intake (~18 fields), ad-spend quick add (7 fields, doubles as the edit form), UHP client/VP forms (already toggled by a header button), revenue forecast log (4 fields, doubles as edit). None fits a title-plus-two-fields composer without hiding required inputs. Resume if any of them gains a clear "title + defaults" shape.
- [ ] Pages that already use compact filters - Skipped: directory, admin performance, announcements (MultiSelectFilter); work-tracker, CRM, reports, AI spending, tasks, tickets, interns, probation, employee management, jobs, notifications, leaderboard, projects, performance workspaces.

### Blocked

None.

## Known Risks
- Pre-existing detector warning (not from this change): gray text on a rose background in `admin/expenses/page.tsx` around line 564.
- The working tree holds unrelated uncommitted edits from other work; `pnpm --filter web typecheck` currently fails on `bingo/page.tsx` (duplicate JSX attribute) and `information-hub/resources/new/page.tsx` (missing `tags`), neither touched here.

## Session History
- 2026-10-06: Surveyed apps/web for the labelled filter card and inline quick-add patterns, extracted the PA tracker's filter controls, and applied them to the 6 matching screens. Composer pattern deliberately not spread (see Skipped).
