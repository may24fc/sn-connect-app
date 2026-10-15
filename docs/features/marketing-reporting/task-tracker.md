# Marketing Reporting Task Tracker

## Current Status

The admin Marketing Reports workspace now uses an explicit 500-row endpoint contract that matches its bounded cross-report snapshot queries. The shared pagination default remains 100 for ordinary list APIs. Local measurement changed the affected report request from 30/30 HTTP 400 responses to 30/30 HTTP 200 responses; the post-fix p50/p95 was 130.6/181.9 ms in `next dev` against local Supabase.

Weekly-plan items now use a disclosed 1,000-character limit in the editor and request schema. The editor uses multiline controls with near-limit counts and inline validation, while report mutations surface the API's actionable validation message instead of `Invalid request body`.

Marketing Reports now shares the application's date-range filter with UHP Outreach. Start/end choices remain drafts until Apply, both boundaries are linked and capped at today, and Clear removes the range across report tabs.

See [Optimization Record](./optimization.md).

The Ad Spend period-control rollout is documented in [Metrics Period Consistency](../metrics-period-consistency/task-tracker.md).

## Tasks

### Done
- [x] Restore the admin Marketing Reports pagination contract - 2026-10-15; added an endpoint-specific 500-row parser in `apps/web/src/app/api/reports/_pagination.ts`, wired `GET /api/reports` to it, and added focused contract plus browser regression coverage. Validation: 7 focused Vitest tests, web TypeScript, focused Biome checks, and the production web build passed; 30-sample local measurement changed the reports target from 30 HTTP 400 responses to 30 HTTP 200 responses, with post-fix p50/p95 130.6/181.9 ms; Playwright passed all four tabs as local admin at 1440x900 and 390x844 with five observed 200 report responses, no report-request/page errors, no mobile overflow, and inspected screenshots. See [Optimization Record](./optimization.md).
- [x] Audit the admin Marketing Reports load failure - 2026-10-15; traced all report queries through `useReports`, `GET /api/reports`, and shared pagination validation; confirmed that each `pageSize: 500` request is rejected because the endpoint uses the default 100-row maximum; reviewed the supplied desktop error-state screenshot and adjacent loading, empty, filter, and tab states in source. No product code changed and no live browser session was claimed. See [Optimization Record](./optimization.md).
- [x] Consolidate the Marketing Reports custom range - 2026-10-15; replaced two duplicated DayPicker popovers with shared `DatePickerField` and `DateRangeFilter` components also used by UHP Outreach. Validation: 2 focused range-component tests passed; web TypeScript, focused Biome checks, and the full monorepo production build passed; Playwright passed on `/admin/reports` as local admin at 1440x900 and 390x844, including draft-versus-applied API parameters, Apply/Clear, open calendar, dark-mode emulation, overflow, and console/network checks. Screenshots inspected. See [Optimization Record](./optimization.md).
- [x] Share Ad Spend year-period controls and protect period responses - 2026-10-08; changed `apps/web/src/components/marketing/MarketingAdSpendDashboard.tsx` and adopted shared `MetricsPeriodSelect`, `yearPeriodOptions`, and `usePeriodRequestGuard`. Validation: web typecheck, 20 focused cross-feature tests, local production build, and 30-sample before/after local API measurement passed. The unaffected control also changed, so no speed improvement is attributed to this work.
- [x] Audit weekly-plan input limits and submission failure UX - 2026-10-06; reviewed the editor, report schema, report mutations, reports API, shared controls, and report storage; validation: traced the editor payload through Zod validation to PostgreSQL `text` storage.
- [x] Align weekly-plan client and server limits - 2026-10-06; changed `apps/web/src/components/reports/MarketingReportEditor.tsx` and `apps/web/src/lib/schemas/report.schema.ts`; validation: focused Vitest boundary coverage and web typecheck passed.
- [x] Surface actionable API validation errors - 2026-10-06; changed `apps/web/src/lib/api-error.ts`, `apps/web/src/hooks/useCreateReport.ts`, and `apps/web/src/hooks/useUpdateReport.ts`; validation: focused API-error test and web typecheck passed.

### In Progress

### Deferred
- [ ] Replace whole-snapshot client aggregation with paginated data plus dedicated aggregate/filter metadata endpoints - the 500-row bound restores the established production contract but can truncate aggregate views if the matching cohort grows beyond 500; resume when report volume approaches the bound or the reporting data contract is redesigned. At that point, mark summary metrics unavailable on request failure and preserve safe API error categories in `useReports`.

### Skipped

### Blocked

## Session History
- 2026-10-15: Repaired the reports-only pagination contract without weakening the shared 100-row default. Focused tests, TypeScript, Biome, and the production build passed; local latency sampling recorded 30/30 failures before and 30/30 successes after; Playwright exercised all four tabs on desktop and mobile against local Supabase and screenshots were inspected. Production data was not mutated because the failing requests had been rejected before the database query.
- 2026-10-15: Audited the supplied Marketing Reports failure state. Confirmed a deterministic HTTP 400 regression introduced when shared pagination validation capped the reports endpoint at 100 while the existing admin workspace still requested 500 rows in seven queries. All four tabs are affected; retry repeats the invalid request, filter options silently fall back to configured choices, and zero summary cards misrepresent unavailable data as measured zeros. Remediation remains deferred because this was a review-only request.
- 2026-10-15: Replaced the reporting page's duplicated calendars with the shared date-range control. Filtering now changes only on Apply; Clear resets all tabs. Final desktop/mobile browser verification and the full monorepo production build passed.
- 2026-10-08: Ad Spend now uses the shared year selector and applies paired ad-spend/revenue results only for the latest selected period. Previous-period totals are hidden during a switch, and failed loads offer retry. No database change; browser click-testing remains useful. See the cross-feature optimization record for measurements.
- 2026-10-06: Replaced the undisclosed 300-character boundary with a 1,000-character shared contract, added multiline entry and length feedback, and preserved authoritative server validation. Validation passed: 13 focused tests and `@hr-portal/web` typecheck. No database migration was required because report content is stored as PostgreSQL `text`.
