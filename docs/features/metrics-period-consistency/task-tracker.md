# Metrics Period Consistency Task Tracker

## Current Status

The period rollout now shares calendar-boundary calculations, year options, a controlled selector, and stale-response protection across the relevant views. A viewer's local calendar drives "This week/month/quarter" and default reporting-month choices; UTC remains the storage and request timestamp format. See [optimization.md](optimization.md) for the code map and measurements.

## Tasks

### Done

- [x] Implement shared calendar-period rules and selector - 2026-10-08; added `apps/web/src/lib/metrics-period.ts`, `apps/web/src/components/data-display/MetricsPeriodSelect.tsx`, and focused boundary/selector tests; adopted in UHP Outreach, Marketing Ad Spend, AI Spending, and the Leaderboard month query. Validation: web typecheck, 20 focused tests, and local production build passed; before/after latency results are in `optimization.md`.
- [x] Protect server-backed period views from stale responses - 2026-10-08; added `apps/web/src/hooks/usePeriodRequestGuard.ts` and its rapid-switch test; adopted in UHP Outreach, Volume Points, and Marketing Ad Spend. Volume Points and Marketing hide totals from a previously selected period while loading and provide retry on period-load failure. Validation: web typecheck, 20 focused tests, and local production build passed; before/after latency results are in `optimization.md`.
- [x] Audit period metrics across UHP Outreach and Volume Points, Marketing Ad Spend, AI Spending, Leaderboard, Expense Analytics, and PA Tasks - 2026-10-08; changed `docs/features/metrics-period-consistency/task-tracker.md` and `docs/features/metrics-period-consistency/optimization.md`; validated by reading the selectors, calculation paths, and API routes linked in the optimization record. Confirmed PA Tasks has filters and pagination but no period metrics selector.

### In Progress

### Deferred

- [ ] Consider TanStack Query caching for UHP and Marketing period data - latest-request guards now prevent stale writes, and those screens retain local state for optimistic mutations and multi-response updates. A cache migration adds complexity without a measured need; resume if repeated period switches show material network cost or more consumers need shared cache state.

### Skipped

### Blocked

## Session History

- 2026-10-08 (implementation): Used viewer-local IANA calendar boundaries for relative periods, preserving UTC timestamps and fixed scheduled digest windows. Shared selector and calendar utilities, added stale-response guards and loading/error states, and kept feature-specific metric calculation. Twenty focused tests, web typecheck, and local production build passed. Outreach page p50/p95 changed 60.2/78.6 to 66.4/84.1 ms; the unaffected notifications control changed 55.4/79.5 to 51.8/71.9 ms, so no overall speed claim is made. Browser click-testing remains open.
- 2026-10-08: Audited seven product areas and distinguished UI control reuse from date semantics and data fetching. Recommended shared, explicit period-bound calculation plus a thin reusable selector, with domain-owned metric summaries and period-keyed query state. No code or database changes; no latency claim was made.
