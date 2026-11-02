# Control Hub Telegram Community Optimization Record

## Current Status

The v1 design prioritizes delivery reliability, privacy, and auditable decisions. This is a reliability and workflow-friction record; no latency improvement is claimed or measured.

## Relevant Code Map

- [Telegram webhook](../../../apps/web/src/app/api/webhooks/telegram/route.ts) — identity linking, topic diagnostics, and `/ticket` conversion.
- [Ticket delivery](../../../apps/web/src/lib/telegram-community.ts) — privacy-safe formatting and outbox dispatch.
- [Recognition service](../../../apps/web/src/lib/recognition.ts) — Manila periods, positive evidence adapters, and publication.
- [Recognition workspace](../../../apps/web/src/components/recognition/RecognitionAdminPage.tsx) — HR evidence review, editing, approval, and explicit publishing.
- [Database migration](../../../supabase/migrations/20261024000001_control_hub_telegram_community.sql) — uniqueness, outbox, audit state, and transactional conversion.

## Reliability and Workflow Entries

### Implemented — Durable ticket delivery

- Problem/evidence: Telegram can fail after a ticket database mutation succeeds.
- Solution: the ticket trigger writes an idempotent outbox event in the ticket transaction; immediate Inngest dispatch and a ten-minute sweep retry failed/pending rows.
- Validation: local migrations applied; new integration functions are clean under schema lint; duplicate-safe claims are enforced before ticket and recognition delivery.

### Implemented — Recognition privacy boundary

- Problem/evidence: performance answers, client details, and negative employee data must not be published or exposed as ranking inputs.
- Solution: adapters return generic positive completion facts only; HR edits the public reason; publication reads only approved selections and public copy.
- Validation: Manila period tests passed 4/4; web typecheck and focused browser flows passed. Live Telegram content inspection remains part of the production pilot.

### Implemented — Server-confirmed governance

- Problem/evidence: nominations, approvals, and Telegram posts are auditable or externally visible actions.
- Solution: all remain server-confirmed with disabled pending controls and explicit errors; no optimistic cache mutation is used.
- Validation: employee mobile and HR desktop Playwright flows passed 2/2; screenshots were inspected.

## Visual Guide

```mermaid
flowchart LR
  A[Telegram post or portal ticket] --> B[Control Hub ticket]
  B --> C[Database outbox]
  C --> D[Inngest delivery]
  D --> E[Ticket Progress Feed]

  F[Projects / PA / UHP / deadlines / nominations] --> G[Private HR evidence pool]
  G --> H[HR edits and approves]
  H --> I[Community Highlights]
```

## Change Log

- 2026-10-24: Added v1 reliability, privacy, and server-confirmed interaction decisions. No performance measurement was required or claimed.
- 2026-10-24: Added atomic delivery claims, immutable submission timestamps, local schema validation, and focused browser verification.
