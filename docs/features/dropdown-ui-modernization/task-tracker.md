# Dropdown UI Modernization Task Tracker

## Current Status

The application dropdown rollout is complete: all 20 audited raw HTML `<select>` controls across six files now use the shared modern Radix-based Select, and a repository-wide regression test prevents native selects from returning under `apps/web/src`.

Related audit and rollout record: [optimization.md](optimization.md).

## Tasks

### Done
- [x] Inventory raw dropdown controls and identify the canonical component - 2026-10-07; searched `apps/web/src` and reviewed `packages/ui/src/primitives/select.tsx`, `packages/ui/src/components/forms/FormSelect.tsx`, and the primitive documentation; found 20 raw selects in six files and confirmed the shared `Select` family is the current visual/accessibility standard.
- [x] Modernize UHP dropdowns - 2026-10-07; changed `apps/web/src/components/uhp/UhpClientTrackerPage.tsx`, `apps/web/src/components/uhp/UhpClientDetailDialog.tsx`, `apps/web/src/components/uhp/UhpSourceSelect.tsx`, and `apps/web/src/components/uhp/UhpVolumePointsPage.tsx`; added `tests/components/uhp-modern-selects.test.ts`. Replaced 12 native controls while preserving form payloads, empty-value sentinels, inline optimistic mutations, and activity-type appointment suggestions. Validation: web TypeScript passed; the dropdown regression test passed; Biome reported warnings only and no errors.
- [x] Modernize seven AI Spending dropdowns - 2026-10-07; changed `apps/web/src/app/(app)/(employee)/ai-spending/page.tsx`; converted the dashboard period, provider and spend-type filters, rows-per-page selector, and provider/spend-type/currency form fields while preserving controlled state and page-reset behavior. Validation: web TypeScript passed; application-wide native-select regression passed; focused Biome lint had warnings only and no errors.
- [x] Modernize the Performance Cycles quarter dropdown - 2026-10-07; changed `apps/web/src/app/(app)/(admin)/admin/performance/cycles/page.tsx`; retained the existing quarter union and derived date-range behavior. Validation: web TypeScript passed; application-wide native-select regression passed; focused Biome lint had no errors.
- [x] Prevent native dropdown regressions across the web app - 2026-10-07; expanded `tests/components/uhp-modern-selects.test.ts` to recursively inspect every TSX file under `apps/web/src`; repository search confirmed zero raw `<select>` elements; focused suite passed 11 tests.

### In Progress

### Deferred

### Skipped

### Blocked

## Session History
- 2026-10-07 (completion): Converted the final eight native selects in AI Spending and Performance Cycles. Repository search now returns zero raw selects in the web app. TypeScript and 11 focused tests passed; browser click testing remains the only validation gap.
- 2026-10-07: Audited all raw select controls, selected the shared Radix `Select` as canonical, modernized the active UHP feature completely, and deliberately kept unrelated AI Spending and Performance changes out of the current patch. Remaining risk is browser-level verification of portaled dropdowns and form submission.
