# ADR-007: Ownership of Backend Surfaces With No Frontend

## Status

Proposed — the standups decision below needs a product owner's answer before it can be marked Accepted.

## Context

The frontend–backend integration audit of 2026-09-18
(`docs/apps/web/frontend-backend-integration-audit-2026-09-18.md`) found backend
capabilities with no consuming frontend, and visible frontend controls with no
backend behind them. Most were connected during the audit remediation pass. Three
remain, and they are not implementation gaps — they are ownership questions that
need a product decision rather than code.

Leaving them undocumented is what caused the problem in the first place: a route
that nothing calls looks like an oversight to the next reader, and a button with
no handler looks like a bug to the next administrator.

## Decision

### 1. Standups — undecided, needs a product owner

The standups backend is complete and unconsumed:

- `apps/web/src/app/api/standups/route.ts` — list and create
- `apps/web/src/app/api/standups/[id]/route.ts` — detail, update, delete
- `apps/web/src/app/api/standups/upload/route.ts` — recording upload
- Tables `standup_recordings` and `standup_topics`

No frontend route, hook, or component references any of it. The three options are:

1. **Planned user-facing feature.** Needs a route, a frontend owner, and a place
   in the navigation. The remediation pass did not build this, because inventing
   the UX for an unspecified feature is a product decision, not a gap to fill.
2. **Automation/API-only.** If an external workflow posts standups, say so here,
   document the caller, and take the feature off the frontend backlog.
3. **Legacy.** If nothing calls it and nothing will, retire the routes and
   tables rather than carrying dead authenticated endpoints.

Until this is answered, treat the standups routes as **unowned** and do not build
frontend against them.

### 2. Certificate generation for associates — no backend, control disabled honestly

`Generate Certificate` on the associate detail page has no backend. There is no
certificate template, no storage location, and no decision about who may issue
one. Rather than leave a silent no-op, the control now opens an explicit
"not available yet" dialog, so an administrator cannot believe an action was
attempted.

Building this needs, at minimum: a template source, a rendering path (the
expense monthly report already renders PDFs server-side and is the obvious
precedent), a storage bucket, and an authorization rule.

### 3. HR notes on associates and probationary employees — no backend, controls disabled honestly

`Edit Notes` on the associate detail page and `Add Note` on the probation page
have no backend. There is no notes table, and notes about an employee are
sensitive data that needs its own RLS policy and audit trail — the same care as
the `employees` table, not a free-text column bolted onto an existing row.

Both controls now open the same explicit "not available yet" dialog.

Building this needs a table (`employee_notes` or similar) with author, subject,
visibility scope, soft delete, and RLS restricting reads to HR and the subject's
management chain; plus audit logging, since these notes qualify as sensitive
personnel data.

## Consequences

- No visible control in the admin UI is a silent no-op. Every control either
  performs its action or says plainly that the workflow does not exist yet.
- The standups routes stay in the codebase but are marked unowned here, so the
  next audit does not re-report them as an integration gap.
- Certificate generation and HR notes are tracked as product decisions with
  stated prerequisites rather than as frontend wiring tasks.

## Related

- `docs/apps/web/frontend-backend-integration-audit-2026-09-18.md` — the audit
  that raised these, including the implementation status of every other finding.
