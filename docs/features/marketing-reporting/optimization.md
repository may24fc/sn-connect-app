# Marketing Reporting Optimization Record

## Current Recommendation

Implemented: weekly-plan items use a 1,000-character per-item limit enforced by both browser and server. This is generous enough for a detailed task while keeping each entry operational rather than turning the plan into an unbounded document.

## Relevant Code Map

- [Ad Spend period view](../../../apps/web/src/components/marketing/MarketingAdSpendDashboard.tsx), [shared period selector](../../../apps/web/src/components/data-display/MetricsPeriodSelect.tsx), [year options](../../../apps/web/src/lib/metrics-period.ts), and [request guard](../../../apps/web/src/hooks/usePeriodRequestGuard.ts) - year choice and latest-response safety.
- [Weekly-plan editor](../../../apps/web/src/components/reports/MarketingReportEditor.tsx) - multiline entry, disclosed limit, counter, and inline validation.
- [Report schema](../../../apps/web/src/lib/schemas/report.schema.ts) - authoritative item, metric, and notes limits.
- [API error adapter](../../../apps/web/src/lib/api-error.ts) - extracts the first actionable Zod field/form message.
- [Create-report hook](../../../apps/web/src/hooks/useCreateReport.ts) and [update-report hook](../../../apps/web/src/hooks/useUpdateReport.ts) - use the shared API error adapter.
- [Boundary tests](../../../tests/report-input-limits.test.ts) and [API error tests](../../../tests/api-error.test.ts) - exercise the request contract and error mapping.

## Findings

### Implemented - 2026-10-08: Ad Spend period response safety

- Problem/evidence: The year selector and option list were independently implemented, and paired ad-spend/revenue requests could render an old year's data after a rapid switch.
- Delivered solution: Reuse the controlled period selector and year options; accept both responses only for the latest selected period, hide old totals while switching, and offer retry after load failure.
- Relevant paths: Ad Spend period view and shared controls/guard in Relevant Code Map.
- Validation: Web typecheck, 20 focused cross-feature tests, local production build, and 30-sample local before/after API measurements passed. The API p50/p95 moved 64.5/90.7 to 59.3/73.9 ms, while an unaffected control also improved; this is not evidence of a causal server-speed gain. Full measurements are in [Metrics Period Consistency](../metrics-period-consistency/optimization.md).

### Implemented - Weekly-plan item length and error recovery

- Problem/evidence: the request schema rejected items above 300 characters, but the editor did not disclose that boundary and reduced detailed validation failures to `Invalid request body`.
- Delivered solution: one exported 1,000-character constant drives server validation and the client `maxLength`; the editor uses multiline fields, announces the boundary, shows a count near it, validates legacy/programmatic over-limit values inline, and maps nested API validation details to a useful message.
- Relevant paths: editor, report schema, create/update hooks, API error adapter, and focused tests.
- Validation: 13 focused Vitest tests passed; `pnpm --filter @hr-portal/web typecheck` passed.

## Visual Guide

```mermaid
flowchart LR
    A[Weekly-plan textarea] -->|1,000-character browser cap| B[Report payload]
    B -->|authoritative Zod validation| C[Reports API]
    C -->|serialized marketing context| D[(PostgreSQL text)]
    C -->|field-level corrective message| A
```

## Change Log

- 2026-10-08: Shared the Ad Spend year control and added latest-period response safety, including stale-data hiding and retry. Recorded local comparison in the cross-feature optimization record.
- 2026-10-06: Implemented the shared weekly-plan limit, inline UX, and actionable API validation errors. No database schema change was needed.
