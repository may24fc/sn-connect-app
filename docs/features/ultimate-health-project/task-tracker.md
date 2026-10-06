# Ultimate Health Project Task Tracker

## Current Status

UHP Herbalife Portal Reminders is implemented and connected to the live n8n workflow. Production activation remains dependent on configuring a Telegram destination and completing the first delivery verification.

Related reliability review: [optimization.md](optimization.md).

## Tasks

### Done
- [x] Implement authenticated UHP reminder delivery-history callback - 2026-09-28; changed `apps/web/src/app/api/uhp/reminders/runs/route.ts`, `apps/web/src/app/api/uhp/_lib.ts`, and `supabase/migrations/20260923000002_create_uhp_workspace.sql`; focused UHP reminder and workflow tests passed.
- [x] Configure live n8n reminder callback nodes to use `Control Hub Callback` - 2026-09-28; live workflow `tGgNv4OB3vtADFZg` has Header Auth attached to both success and failure callback nodes; inspected through the configured n8n MCP connection.
- [x] Audit UHP reminder deployment state - 2026-10-02; live workflow URL, schedule, credential attachment, failure branch, activation state, recipients, and execution history inspected; `pnpm exec vitest run n8n/workflows/uhp-workflows.test.ts apps/web/src/lib/uhp-reminders.test.ts` passed (10 tests).

- [x] Add toggleable "Replied" column to the Outreach Tracker table - 2026-10-06; added `supabase/migrations/20261006000001_add_replied_to_uhp_clients.sql` (`uhp_clients.replied boolean NOT NULL DEFAULT false`); changed `apps/web/src/components/uhp/UhpClientTrackerPage.tsx`, `apps/web/src/lib/schemas/uhp.schema.ts`, `apps/web/src/app/api/uhp/clients/route.ts`; `pnpm --filter web typecheck` passed. Toggle PATCHes the existing `/api/uhp/clients/[id]` route, optimistic with rollback. Migration applied locally 2026-10-06 (`supabase migration up --local`; also applied pending `20261001000001`) and verified the column (`boolean NOT NULL DEFAULT false`). Production already had the migration recorded and the column present (checked read-only via `supabase migration list --linked` and a REST select); no push was made from this session. UI toggle not yet click-tested.

### In Progress
- [ ] Production reminder rollout - configure at least one Telegram destination, run a due-date delivery test, verify the Control Hub history callback, then activate the workflow.

### Deferred
- [ ] Immediate end-to-end reminder test - the workflow intentionally emits no data on non-due dates; resume on a due date or with an explicitly approved temporary test configuration that sends a real Telegram message.

### Skipped

### Blocked
- [ ] Activation and first delivery verification - Telegram recipient/chat ID has not been configured; owner: workspace administrator.

## Session History
- 2026-10-06: Added a manual Replied checkbox column to the Outreach Tracker. Decision: stored flag on `uhp_clients`, deliberately independent of `uhp_client_activities.reply_received`, so toggling it does not change the Replies / response-rate metrics. Migration is on local and production. Remaining: click-test the toggle; decide whether the metrics should ever read this flag.
- 2026-10-02: Audited live `[Control Hub] UHP Herbalife Portal Reminders`. It is inactive with `destinationsJson: []` and no executions. The production Control Hub URL, Telegram credential attachment, two Header Auth callback attachments, and failure callback branch are present. A manual execution stopped after the Code node because October 2 is neither a Monday nor the adjusted delivery date for the 5th or 16th.
