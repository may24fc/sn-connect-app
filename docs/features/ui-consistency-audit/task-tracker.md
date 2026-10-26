# UI Consistency Audit Task Tracker

## Current Status

All audit findings F1–F11 plus the two follow-ups (native selects, page eyebrows) are implemented and browser-verified (2026-10-26). Owner decisions: 35px for header actions; one title size for every page; instant (no "Apply") filters on finance; uniform control heights; native selects replaced; a section eyebrow on every page; standards for toggles, pagination and table headers chosen by the implementer. Every control family now renders one size across 125 pages. Remaining items are listed under Skipped.

### Standards now in code
| Component | Standard | Source of truth |
|---|---|---|
| Control height | 35px (`h-10`) for `Button`, `Input`, `SelectTrigger`, `MultiSelectFilter`, `FilterDateInput`, tabs, toggles | `packages/ui/src/primitives/{button,input,select}.tsx`, `tabs-classes.ts` |
| Page title / subtitle | `PageTitle` = section eyebrow + `text-2xl font-bold tracking-tight text-foreground` h1; subtitle `mt-1 text-sm text-muted-foreground` | `packages/ui/src/layout/PageTitle.tsx`, `PageHeader.tsx` |
| Page eyebrow | Sidebar section of the route (e.g. "Finance"), else workspace name; supplied by `AppShell` via `PageContextLabelProvider`. Use `<PageTitle>`; when the title shares a row with an icon/badge, put `<PageEyebrow />` above the row and pass `eyebrow={false}` | `getNavContextLabel` in `packages/ui/src/layout/Sidebar.tsx`, `apps/web/src/components/layout/AppShell.tsx` |
| Dropdowns in forms | shared `Select` (Radix). Plain forms keep working through `name`/`defaultValue`; no empty-string items (use `SelectValue placeholder`) | `packages/ui/src/primitives/select.tsx` |
| Search | `FilterSearchInput` | `apps/web/src/components/data-display/FilterControls.tsx` |
| Filter dropdowns | `FilterSelect` (single), `MultiSelectFilter` (multi) — same look | `FilterControls.tsx`, `packages/ui/src/components/MultiSelectFilter.tsx` |
| Tabs and view toggles | pill tabs; `ToggleGroup` (`segmented`) shares the tab classes; `choice` variant for in-form rating pickers | `packages/ui/src/primitives/tabs-classes.ts`, `components/ToggleGroup.tsx` |
| Row actions | `RowActionsTrigger` (28px ghost `⋯`) in a dropdown; Actions column right-aligned | `packages/ui/src/components/RowActionsTrigger.tsx` |
| Pagination | `PaginationBar` (range left, `page / total` + chevrons right; hidden when empty); `UrlPaginationBar` for server pages | `apps/web/src/components/data-display/{PaginationBar,UrlPaginationBar}.tsx` |
| Table header | `tableHeaderClassName` + `tableHeadTextClassName` | `packages/ui/src/primitives/table-classes.ts` (plain module, server-safe) |
| Cancel button | `variant="outline"` (77 existing uses) | — |

## Tasks

### Done
- [x] Audit crawl - 2026-10-25; 148 route visits (136 super admin, 12 associate), 125 unique pages, real local auth, production build. No tracked paths changed.
- [x] F5 Header actions 35px - 2026-10-25; header actions on 23 pages, `SettingsPage.tsx`, access-manager buttons; `/expenses` indigo override removed.
- [x] F4 Row actions - 2026-10-25; `RowActionsTrigger` in directory, employee management (3), cycles, probation, both reports tables, `TaskList.tsx`, `InternCard.tsx`; categories inline actions square + labelled.
- [x] F2 Filter dropdowns - 2026-10-25; `MultiSelectFilter` restyled to `FilterSelect` behaviour (nested button removed); directory Status/Employment Type on `FilterSelect`.
- [x] F1 Search - 2026-10-25/26; 25 page searches on `FilterSearchInput` plus finance ledger and invoice register.
- [x] F10 Mobile overflow - 2026-10-25; directory and OKRs headers wrap (241px → 0, 45px → 0).
- [x] F11 Control heights - 2026-10-26; `Input` and `SelectTrigger` raised to `h-10` and `rounded-md` (was 32px, `Input` 7px radius); filter kit and `PersonSearchSelect` skeleton follow. Calendar "Today", Projects "Mine only", UHP refresh, project-form remove buttons and Leaderboard league select no longer use small sizes. Compact selects inside table rows, popovers and rows-per-page stay compact by design.
- [x] F7 Toggles - 2026-10-26; `ToggleGroup` rebuilt (generic value type, icons, `segmented`/`choice` variants, `<fieldset>` + `aria-pressed`). 10 hand-rolled toggles migrated (employee management, interns ×3, OKRs ×2, super-admin tasks, files, reports, tasks) plus expense analytics By week/By month; performance rating forms keep `choice`. Tabs and toggles fixed at `h-10`.
- [x] F8 Pagination - 2026-10-26; `PaginationBar` added; `ServerPagination`, `TrackerPagination` (now hidden on a single page) and `DataTablePagination` render through it; 9 inline pagers replaced (directory, admin invoice, both notifications, performance individual, OKRs, announcements, information hub, AI spending). `ReportsSubmissionsTab` Previous/Next is a report stepper, not pagination, and is unchanged.
- [x] F9 Table headers - 2026-10-26; constants in `table-classes.ts` used by `TableHead` and 17 hand-built headers (war room ×2, leaderboard, compare dashboard, categories, account inventory, work tracker ×2, finance expenses/reports/overview, catalog, invoice register, properties ×3, Wise batches, UHP ×2).
- [x] F6 Page titles - 2026-10-26; 99 page titles and their subtitles normalized by class (layout classes kept); `PageHeader` title/description aligned; Ticket Intake heading fixed.
- [x] F3 Finance - 2026-10-26; `/finance/expenses`: `FinanceExpenseFilters` (debounced vendor search, month, category select, clear only when active) replaces the Apply-filters card and category chips; link tabs use the shared pill classes; header actions are `Button`s; `UrlPaginationBar`; Actions column right-aligned. Server page still validates every param. `/finance/staff-payments`: register toolbar uses `FilterSearchInput` + `FilterSelect`, Eye/EyeOff hide-amounts button, `PaginationBar`, `Button`/`Textarea` in the review panel. 31 raw finance/property buttons converted to `Button` with variants chosen from their old styling; property register tabs use the shared tab classes. Cancel buttons standardized to `outline` app-wide (9 outliers).

Validation (2026-10-26, local Supabase, production build `next start -p 3001`, role super admin + associate):
- `npx tsc --noEmit` clean in `apps/web` and `packages/ui`.
- Biome: no diagnostics on changed lines; all new/rewritten files (`RowActionsTrigger`, `table-classes`, `tabs-classes`, `PaginationBar`, `UrlPaginationBar`, `FinanceExpenseFilters`, `ToggleGroup`, `e2e/ui-consistency.spec.ts`) clean.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test --config playwright.local.config.ts e2e/ui-consistency.spec.ts e2e/table-actions-convention.spec.ts` → 2 passed. The consistency spec covers directory toolbar heights, input = button height, header action heights across pages, toggle and tab heights, finance instant filtering (URL updates, empty state, clear), and 390px directory overflow.
- Full re-crawl, 1440px: titles 21px/700 ×116 (was 5 sizes); search 35px ×30 (was 3 variants); dropdowns 35px ×103 (was 3); tabs/toggles 35px ×38 (was 3 styles); table headers one style (except Recognition, see Skipped); mixed-height toolbar rows 20 → 5, all five false positives (bare `<input>` inside the 35px `FilterDateInput` label, one hidden select).
- 390px: no horizontal overflow on directory, OKRs, PA tasks, employee management, tickets, finance expenses, staff payments, tasks.
- Console/network errors: only the pre-existing set (400 `/api/employees`, 500 `/api/performance/okrs`, 403 `/api/review/*`, intermittent 500 `/api/hub-usage/heartbeat`) plus Christmas Tree's external asset DNS lookup.

### In Progress

None.

- [x] Native selects - 2026-10-26; 23 native `<select>`s in 8 files (account inventory, employee expenses, finance reports, review, finance approver settings / catalog / correction / properties) replaced with the shared `Select`. Controlled ones use `onValueChange`; form-submitted ones keep `name`/`defaultValue`/`required` (Radix renders a hidden native select inside forms); empty "Select…" options became `SelectValue` placeholders; uncontrolled fields without a default got their first option as default so submissions are unchanged. Account-inventory population handler now narrows the value instead of casting. Validation: finance reports GET form submits `?view=week` (spec); property form `FormData` yields `occupancy=occupied`, `rentCadence=weekly`; crawl finds no native selects outside Recognition; all 106 page dropdowns 35px.
- [x] Page eyebrow on every page - 2026-10-26; added `PageTitle`/`PageEyebrow`/`PageContextLabelProvider` (`packages/ui/src/layout/PageTitle.tsx`) and `getNavContextLabel` (`packages/ui/src/layout/Sidebar.tsx`, additive; section-config selection extracted into `getSectionConfig` with unchanged behaviour). `AppShell` provides the label for the current route. 99 page titles converted to `PageTitle` (11 that share a row with an icon/badge use a separate `PageEyebrow` above the row); `PageHeader` renders through `PageTitle`; super-admin Ticket Intake shows the eyebrow when it is the page `h1`. Removed 9 page-specific labels in other styles (5 finance/property "Finance"-style labels, "Identity governance", "SFO · Seafood Outlet · Revenue Forecast", "Personal Finance", "Ultimate Health Project") and the custom dashboard/marketing `eyebrow` props. Validation: crawl — 116/116 titled pages have the label, 115 at 4px above and left-aligned with the title (Employee Management aligns with the title's leading icon), no stacked duplicate labels; spec checks People / Finance / Work & Performance / Internal Management labels.

### Skipped
- [ ] Recognition pages - Applied in the working tree on 2026-10-26 but intentionally not committed: `RecognitionNominationPage.tsx` (`PageTitle`, Colleague/Category on `Select` with `<label htmlFor>`, `required` kept) and `RecognitionAdminPage.tsx` (`PageTitle`, shared table header) are part of the owner's uncommitted Telegram/Recognition feature, whose routes and Supabase migrations are not yet in production. They ship with that feature's commit. Browser-verified locally: eyebrow "Knowledge & Support", 35px triggers, required colleague blocks submit, no page errors.
- [ ] Pages without a title - Skipped: `/admin/onboarding-setup`, `/booking/steven`, `/expenses/verify` render no `h1`, so they have no eyebrow. Resume: add a `PageTitle` if they should read as normal pages.
- [ ] Bingo and Christmas Tree - Skipped: themed seasonal pages.
- [ ] Dynamic `[id]` routes - Skipped: need seeded IDs; list pages linking to them were covered.

### Blocked

None.

## Known Risks
- The local database is sparsely seeded; many tables were empty, so populated-row layouts were checked mainly on directory, employee management and resource categories.
- `Input`/`SelectTrigger` height change (32 → 35px) applies to every form, including dialogs; dialogs were not individually screenshotted.
- Directory refetches without placeholder data, so a just-selected multi-select filter briefly reads "Roles: 1 selected" until options reload.
- `next build` with a custom `NEXT_DIST_DIR` rewrites `apps/web/tsconfig.json` and `apps/web/next-env.d.ts`; both were reverted after every build.

## Session History
- 2026-10-25: Crawled every static Control Hub route; recorded F1–F11. Mock-auth server unusable for this (API 401 without a Supabase session).
- 2026-10-25: Owner chose 35px header actions. Implemented F5, F4, F2, most of F1, F10; added `RowActionsTrigger` and `e2e/ui-consistency.spec.ts`.
- 2026-10-26: Owner approved instant finance filters, one title size, implementer-chosen standards for toggles/pagination/tables, and uniform control heights. Implemented F3, F6, F7, F8, F9, F11. Moved shared class strings into plain modules (`table-classes.ts`, `tabs-classes.ts`) after finding that constants exported from a `'use client'` module would reach Server Components as client references. Local Docker/Supabase had stopped overnight and was restarted for verification. Verified with typecheck, Biome, two Playwright specs, a full 148-visit crawl and a 390px pass.
- 2026-10-26: Owner asked to replace native selects and put the eyebrow on every page. Eyebrow text is derived from the sidebar (section, else workspace) instead of hand-written per page, so new pages get it by using `PageTitle`. Verified: typecheck clean (`apps/web`, `packages/ui`); Biome clean on new files and changed lines; both Playwright specs pass (now also covering eyebrow labels and a Radix `Select` submitting through a plain GET form); full 148-visit crawl with 0 navigation errors, console errors limited to the pre-existing set; 390px pass with no overflow.
- 2026-10-26: Committed and pushed the UI-consistency work to `main` as `b8741459` (154 files). Excluded the owner's uncommitted Telegram/Recognition feature (routes, pages, migrations, Inngest/Telegram changes, `vercel.json`, `docs/ENVIRONMENT.md`, `graphify-out`); `packages/ui/src/layout/Sidebar.tsx` was staged partially (only `getSectionConfig`/`getNavContextLabel`, not the Recognition nav items). Verified the commit in isolation (all other changes stashed, dev `.next` cache moved aside): `tsc --noEmit` clean in `apps/web` and `packages/ui`, `Sidebar.test.tsx` 15/15, `next build` passed.
