# Control Hub Telegram Community Task Tracker

## Current Status

Local implementation and the production portal build are validated, including a separate webhook and token path for the new dedicated Forum bot. Production database migrations are applied, and the user confirmed the dedicated bot environment variables are configured. Application deployment is in progress; webhook registration, forum routing IDs, smoke testing, and the pilot follow deployment. The existing notification/linking bot and its n8n `Control Hub Notifications` credential remain unchanged.

See also [Optimization Record](optimization.md).

## Tasks

### Done
- [x] Replace XP-based Top 3 with an HR-approved evidence model — 2026-10-24; `implementation-plan.md`; reviewed document diff.
- [x] Add integration persistence and idempotency contracts — 2026-10-24; migrations `20261024000001` through `20261024000006`; applied and linted against local Supabase.
- [x] Add forum ticket conversion and privacy-safe ticket outbox delivery — 2026-10-24; Telegram webhook, sender, Inngest client/functions, ticket APIs; web typecheck and local schema validation passed.
- [x] Add employee nomination and HR recognition workspace — 2026-10-24; recognition APIs, services, pages, components, and navigation; focused unit and Playwright checks passed.
- [x] Add Manila Monday generation/publication schedules and environment documentation — 2026-10-24; `vercel.json`, `docs/ENVIRONMENT.md`; reviewed configuration diff.
- [x] Add deployment and support runbook — 2026-10-24; `deployment-runbook.md`; covers bot permissions, topic discovery, webhook secret, smoke tests, retry troubleshooting, rollback, and pilot checks.
- [x] Validate application contracts — 2026-10-24; web and database package typechecks passed; focused Biome error check passed; `tests/lib/recognition-period.test.ts` passed 4/4.
- [x] Validate database locally — 2026-10-24; migrations `20261024000001` through `20261024000006` applied with `supabase migration up --local`; generated database types; schema lint found no new-feature issue after the ticket-category correction. A pre-existing `get_knowledge_source_versions` error and two finance warnings remain outside this feature.
- [x] Verify recognition UI — 2026-10-24; `e2e/recognition.spec.ts` passed 2/2 against mock auth; employee `/recognition` checked at 390×844 and admin `/admin/recognition` at 1440×1000; nomination submission, recent-recipient warning, approval state, publish control, console filtering for known mock-auth 401s, and screenshots reviewed.
- [x] Refresh code knowledge graph — 2026-10-24; final `graphify update .` completed with 13,910 nodes and 33,504 edges.
- [x] Separate Forum traffic from the existing notification/linking bot - 2026-11-02; added `/api/webhooks/telegram-community`, dedicated community token/secret configuration, community sender routing, and pre-configuration `/topicid` discovery; web typecheck and 4 focused Vitest assertions passed.
- [x] Refresh the code knowledge graph after the dedicated-bot split - 2026-11-02; `graphify update .` completed with 14,472 nodes and 35,042 edges.

### In Progress
- [ ] Complete live Telegram Forum routing - production database is migrated; next action is to deploy the dedicated community webhook, register it with Telegram, link the super-admin through the existing bot, capture the shared forum chat ID and four topic IDs, configure routing, and run smoke tests.

### Deferred
- [ ] One-week production pilot - requires a successful dedicated-bot deployment, routing configuration, and smoke test.

### Skipped
- [ ] Equivalent XP for PA, UHP, forms, nominations, or app usage — intentionally excluded to keep Project Tracker XP product-specific.

### Blocked
- [ ] None.

## Session History
- 2026-11-02: User confirmed the new community-bot production variables are configured and authorized deployment. Corrected the recognition cron ownership from the public-site Vercel config to `apps/web/vercel.json`. Pre-deployment validation passed: portal typecheck, focused Vitest suite (8/8), Vercel JSON parsing, and `pnpm build:web`. A scoped production commit excludes unrelated payroll, payout-test, skill, PDF, and graph-cache worktree changes.
- 2026-11-02: Added a dedicated Forum-bot transport while preserving the existing linking/notification bot and n8n credential. `/topicid` now works for linked admins and super-admins before `TELEGRAM_COMMUNITY_CHAT_ID` is configured, resolving the discovery dependency. Focused validation passed: `pnpm --filter @hr-portal/web typecheck` and `pnpm vitest run tests/api/telegram-community-webhook-route.test.ts tests/lib/telegram-community-webhook.test.ts` (4/4). Production deployment and Telegram webhook registration remain blocked on securely accessible new-bot credentials and a deployment path; no forum command should be treated as live yet.
- 2026-10-24: **How `20261024000001`–`20261024000006` reached production.** They were applied to the linked production project `tccdupkjmwwxcvpqnpeb` unintentionally by the Ask AI reflections session, which ran `pnpm db:migrate` (`supabase db push`, linked project, not local) while intending a local apply; it also applied `20261025000001_create_performance_insight_conversations.sql`. This was not an approved rollout. It included the `okrs`/`kpis` `submitted_at` backfill in `20261024000002` and the `telegram_account_links` backfill in `20261024000006`. No rollback was attempted; the user chose to keep them. Application code for this feature is not yet deployed, so production schema is ahead of production code until rollout. See `docs/features/performance-reflection-insights/task-tracker.md`.
- 2026-10-24: Began production Telegram rollout. Verified Supabase production migrations through `20261024000006`, confirmed the production webhook rejects requests without its secret (`HTTP 401`), registered the n8n MCP with Codex, and successfully tested the existing `Control Hub Notifications` Telegram credential. No n8n Telegram Trigger was added because Telegram permits one bot webhook and the Control Hub app owns it. Rollout remains blocked on the forum chat/topic IDs and application environment routing; Vercel inspection/deployment was skipped at the user's direction.
- 2026-10-24: Implemented and locally validated the end-to-end feature, including immutable OKR/KPI submission timestamps and positive on-time performance evidence. Recognition decisions remain HR-reviewed and server-confirmed. Production rollout and live Telegram verification remain deferred pending explicit approval and credentials.
