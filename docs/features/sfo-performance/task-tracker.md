# SFO Performance Task Tracker

## Current Status

The SFO Performance sidebar workspace regression and the CRM-card/chart overlap are fixed and covered by focused unit and authenticated local browser tests. The earlier page-delivery blocker remains recorded separately below.

Optimization and UX record: [optimization.md](optimization.md)

## Tasks

### Done

- [x] Keep SFO Performance navigation in the Seafood Factory Outlet workspace - 2026-10-15; changed `packages/ui/src/layout/Sidebar.tsx`, `packages/ui/src/layout/Sidebar.test.tsx`, and `e2e/sfo-workspace-navigation.spec.ts`; validated exact and nested route classification with `pnpm exec vitest run packages/ui/src/layout/Sidebar.test.tsx` (15 passed), `pnpm --filter @hr-portal/ui typecheck`, and a focused local Playwright run as an admin at desktop and 390x844 mobile viewports in light/dark mode (1 passed). Screenshots confirmed the Seafood Factory Outlet label and active SFO Performance item with no clipping or overlap. The mock-auth server cannot authenticate the protected page's server-side data calls, so page-content/API behavior was outside this sidebar-specific validation.
- [x] Prevent the CRM boundary card from overlaying SFO performance charts - 2026-10-15; changed `apps/web/src/components/marketing/MarketingAdSpendDashboard.tsx`, `apps/web/src/app/(app)/sfo/performance/page.tsx`, `tests/pages/sfo-performance-dashboard.test.tsx`, `tests/pages/sfo-performance-crm.test.tsx`, and `e2e/sfo-workspace-navigation.spec.ts`; replaced fixed full-height wrappers with minimum-height wrappers so dashboard content expands in normal flow. Validation: 7 focused Vitest tests passed, `pnpm --filter @hr-portal/web typecheck` passed, and authenticated local Playwright as `super-admin@example.com` passed at desktop and 390x844 mobile in light/dark mode. Geometry assertions and inspected screenshots confirmed the CRM section starts at least one layout gap below the chart card; local API requests returned HTTP 200 with no console or transport errors.

### In Progress

None.

### Deferred

None.

### Skipped

None.

### Blocked

- [ ] Deliver the SFO Performance page - 2026-10-07; paths: `apps/web/src/app/(app)/sfo/performance/page.tsx`, `apps/web/src/components/marketing/MarketingAdSpendDashboard.tsx`, and `tests/pages/sfo-performance-crm.test.tsx`; evidence: the committed baseline does not contain `MarketingAdSpendDashboard`, while the new page requires its uncommitted `sfoView` prop. Resume when the finance/marketing component batch is approved for delivery; validate with `pnpm exec vitest run tests/pages/sfo-performance-crm.test.tsx` and `pnpm --filter @hr-portal/web typecheck`.

## Session History

- 2026-10-15: Fixed the dashboard/CRM overlap by removing the fixed-height layout constraint. Verified against the explicitly local Supabase environment with a super-admin account; desktop and mobile geometry checks passed, boundary screenshots showed normal vertical flow, and all observed application requests returned HTTP 200.
- 2026-10-15: Added `/sfo/performance` to route-to-workspace classification, covered exact and nested URLs, and verified navigation plus responsive/dark sidebar states in Chromium. Local mock auth produced expected protected API 401 responses and a page-content 404 because it does not create a server session; the sidebar state under test rendered and passed. No latency claim was made.
- 2026-10-07: During the non-finance delivery pass, verified that the SFO page cannot compile against the committed baseline without finance-owned changes. Left the implementation uncommitted as requested.
