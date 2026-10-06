# Marketing Reporting Task Tracker

## Current Status

Weekly-plan items now use a disclosed 1,000-character limit in the editor and request schema. The editor uses multiline controls with near-limit counts and inline validation, while report mutations surface the API's actionable validation message instead of `Invalid request body`.

See [Optimization Record](./optimization.md).

## Tasks

### Done
- [x] Audit weekly-plan input limits and submission failure UX - 2026-10-06; reviewed the editor, report schema, report mutations, reports API, shared controls, and report storage; validation: traced the editor payload through Zod validation to PostgreSQL `text` storage.
- [x] Align weekly-plan client and server limits - 2026-10-06; changed `apps/web/src/components/reports/MarketingReportEditor.tsx` and `apps/web/src/lib/schemas/report.schema.ts`; validation: focused Vitest boundary coverage and web typecheck passed.
- [x] Surface actionable API validation errors - 2026-10-06; changed `apps/web/src/lib/api-error.ts`, `apps/web/src/hooks/useCreateReport.ts`, and `apps/web/src/hooks/useUpdateReport.ts`; validation: focused API-error test and web typecheck passed.

### In Progress

### Deferred

### Skipped

### Blocked

## Session History
- 2026-10-06: Replaced the undisclosed 300-character boundary with a 1,000-character shared contract, added multiline entry and length feedback, and preserved authoritative server validation. Validation passed: 13 focused tests and `@hr-portal/web` typecheck. No database migration was required because report content is stored as PostgreSQL `text`.
