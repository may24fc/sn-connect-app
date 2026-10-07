# SFO Performance Task Tracker

## Current Status

Blocked from non-finance delivery because the new SFO performance page depends on the uncommitted finance-owned `MarketingAdSpendDashboard` component and its `sfoView` prop.

## Tasks

### Done

None.

### In Progress

None.

### Deferred

None.

### Skipped

None.

### Blocked

- [ ] Deliver the SFO Performance page - 2026-10-07; paths: `apps/web/src/app/(app)/sfo/performance/page.tsx`, `apps/web/src/components/marketing/MarketingAdSpendDashboard.tsx`, and `tests/pages/sfo-performance-crm.test.tsx`; evidence: the committed baseline does not contain `MarketingAdSpendDashboard`, while the new page requires its uncommitted `sfoView` prop. Resume when the finance/marketing component batch is approved for delivery; validate with `pnpm exec vitest run tests/pages/sfo-performance-crm.test.tsx` and `pnpm --filter @hr-portal/web typecheck`.

## Session History

- 2026-10-07: During the non-finance delivery pass, verified that the SFO page cannot compile against the committed baseline without finance-owned changes. Left the implementation uncommitted as requested.
