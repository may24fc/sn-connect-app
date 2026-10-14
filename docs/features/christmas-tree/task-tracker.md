# Christmas Tree Task Tracker

## Current Status

The Christmas Tree is implemented with ornament placement, wish editing, optional wish links, realtime updates, responsive presentation, and user-controlled seasonal music. The tree canvas keeps a stable intrinsic height when the secondary panel changes content.

Optimization record: [optimization.md](./optimization.md)

## Tasks

### Done

- [x] Keep the tree canvas stable when the secondary panel switches between ornament selection and the taller wish form - 2026-10-14; changed `apps/web/src/app/(app)/(employee)/christmas-tree/page.tsx` to top-align the grid items, added stable browser-test selectors, and added `e2e/christmas-tree-layout.spec.ts`; `pnpm --filter @hr-portal/web typecheck` passed and `pnpm exec playwright test --config playwright.local.config.ts e2e/christmas-tree-layout.spec.ts` passed 2/2 tests as an employee at 1440x1000 and 390x844 in light and dark modes, covering loading, empty, placed-ball, and API-error states with no console errors, failed requests, horizontal overflow, or canvas dimension drift greater than 2px.
- [x] Add user-controlled Christmas music - 2026-10-14; changed `apps/web/src/app/(app)/(employee)/christmas-tree/page.tsx` and `e2e/christmas-tree-layout.spec.ts`; added a visible on/off control in standard and presentation headers, a looping privacy-enhanced YouTube embed for video `mmJ-KiSIsD4`, and a persistent local preference; `pnpm --filter @hr-portal/web typecheck` passed, focused formatting/lint validation passed with three unrelated pre-existing complexity warnings in the page, and `pnpm exec playwright test --config playwright.local.config.ts e2e/christmas-tree-layout.spec.ts` passed 3/3 tests as an employee across desktop 1440x1000, mobile 390x844, light/dark, music enable/disable, saved opt-out, ornament placement, and API-error states with no Christmas Tree/YouTube request failures or console errors.
- [x] Restrict optional links to Personal Wishes - 2026-10-14; changed `apps/web/src/app/(app)/(employee)/christmas-tree/page.tsx`, `apps/web/src/lib/schemas/christmas-tree.schema.ts`, `tests/schemas/christmas-tree.test.ts`, and `e2e/christmas-tree-layout.spec.ts`; removed link inputs and link display from November/December wish categories, normalized non-personal link submissions to `null`, and added labelled category regions; type-check passed, the focused schema suite passed 7/7 tests, `pnpm exec playwright test --config playwright.local.config.ts e2e/christmas-tree-layout.spec.ts` passed 3/3 tests across desktop 1440x1000, mobile 390x844, light/dark, saved-preference, placement, and API-error states with exactly three Personal Wish link fields and none in the later categories, and the full `pnpm build` completed successfully for all workspace packages and applications.

### In Progress

- None.

### Deferred

- [ ] Capture a before/after browser-load performance baseline for the third-party music embed - implementation began before a baseline was captured, and the repository sampler measures server routes rather than the cross-origin iframe load; resume from a separate pre-change worktree and compare a Playwright browser trace against the current implementation, then record resource timing p50/p95 in `optimization.md`.

### Skipped

### Blocked

## Session History

- 2026-10-14: Confirmed that default CSS Grid row stretching made the tree canvas inherit the wish panel's height after ornament placement. Added start alignment to decouple the primary canvas height from secondary-panel content and verified the employee flow in loading, empty, populated, and API-error states at desktop and mobile sizes, including dark mode. The tree canvas retained its dimensions before and after ball placement.
- 2026-10-14: Added seasonal music using the user-provided YouTube track. The preference defaults on for first-time visitors, persists an opt-out in local storage, and is controlled from both normal and presentation headers. Browser autoplay can still require a user gesture; toggling the control off and on provides that gesture. Browser-load performance measurement remains deferred because no pre-change baseline exists.
- 2026-10-14: Limited optional wish links to the three October Personal Wishes. November “Wish for Others” and December “Wish for SN” now present only the wish text field, submit no link, and do not expose legacy non-personal links in the ornament dialog. Schema and browser regression coverage were updated.
- 2026-10-14: Ran the repository `build-fix-commit-push` skill in build-only mode. The first sandboxed attempt was blocked before compilation by Windows `spawn EPERM`; the approved rerun completed the full `pnpm build` successfully. No migrations were pending, no build fixes were needed, and no commit or push was requested.
