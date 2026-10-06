# Input Validation Task Tracker

## Current Status

The Control Hub text-input inventory covers 330 JSX text controls. Persisted fields now have field-specific client and server limits, and transient searches/filters have a 200-character cap. Six inventory entries intentionally remain caller-controlled or non-text at runtime: shared form/input primitives plus conditional date/numeric controls.

See [Optimization Record](./optimization.md).

## Tasks

### Done
- [x] Build a repeatable text-control inventory - 2026-10-06; added `scripts/audit/input-text-limits.mjs`; validation: inventory completed across `apps/web` and `packages/ui` with 330 controls and six intentional primitive/dynamic exceptions.
- [x] Add server-side limits to persisted text contracts - 2026-10-06; updated shared Zod schemas and route-local request schemas across authentication, employees, expenses, invoices, announcements, jobs, tasks, internships, CRM, performance, resources, AI, reports, PA tasks, UHP, onboarding, standups, and project intake; validation: 77 focused tests and web typecheck passed.
- [x] Align form controls with their domain contracts - 2026-10-06; updated app and shared UI controls with semantic limits for names, email, phone, URLs, identifiers, tags, titles, narratives, comments, searches, and report fields; validation: audit reduced controls without explicit limits from 93 to six intentional exceptions.

### In Progress

### Deferred

### Skipped
- [ ] Add one global default to the base Input/Textarea primitives - skipped because a single ceiling would conflict with legitimate field semantics; reconsider only if the primitives gain an explicit semantic variant API.

### Blocked

## Session History
- 2026-10-06: Completed the cross-Hub input-limit audit and implementation. Limits are selected by use: short identifiers and labels, medium descriptions, long narratives, and bounded query text. Validation passed with 77 focused tests and the web TypeScript check; remaining inventory hits are intentional reusable/dynamic controls. The full suite also ran (585 passed) but retains unrelated failures in existing audit-log mocks, onboarding and seasonal schemas, navigation/helper exports, directory routing, and expense-report expectations.
