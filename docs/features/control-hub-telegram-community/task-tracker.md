# Control Hub Telegram Community Task Tracker

## Current Status

The dedicated community-bot application, webhook, and self-service Telegram disconnect flow are live. A Telegram identity can now be released from its current Control Hub account and linked to another without weakening the one-to-one mapping. Super-admin linking, forum routing IDs, smoke testing, and the pilot remain.

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
- [x] Deploy the Control Hub Telegram Community feature to production - 2026-11-02; pushed scoped commit `4b3ebdc0` to `main`; Supabase migration workflow and both native Vercel deployments succeeded; production community webhook probe returned the expected HTTP 401.
- [x] Register the dedicated Forum bot webhook - 2026-11-02; Telegram `setWebhook` succeeded for `@SNControlHubCommunityBot`, targeting `https://app.sngroup.com.au/api/webhooks/telegram-community`; `getWebhookInfo` reported zero pending updates and no last error.
- [x] Validate self-service Telegram disconnect locally - 2026-11-02; migration `20261102000001` applied to local Supabase; rollback-only database test confirmed link removal, preference preservation, token clearing, and audit creation; route tests passed 4/4, portal typecheck passed, and desktop/mobile Playwright passed 2/2 with screenshots inspected. Schema lint reported only the pre-existing `get_knowledge_source_versions` error.
- [x] Deploy self-service Telegram disconnect - 2026-11-02; pushed scoped commit `024d42f8` to `main`; production Supabase migration succeeded after retrying a transient GitHub release-rate-limit failure; both native Vercel deployments succeeded; live unauthenticated DELETE probe changed from HTTP 405 before promotion to the expected HTTP 401 after promotion.
- [x] Support the renamed default General forum topic - 2026-11-02; the community webhook now treats Telegram's absent `message_thread_id` as General & Ideas only when `TELEGRAM_GENERAL_IDEAS_TOPIC_ID` is unset and sends the required database topic parameter explicitly as `null`; deployment and environment documentation updated; focused Telegram tests passed 5/5 and portal typecheck passed.

### In Progress
- [ ] Complete live Telegram Forum routing - link the super-admin through the existing bot, capture the shared forum chat ID and four topic IDs, configure routing, and run smoke tests.

### Deferred
- [ ] One-week production pilot - requires a successful dedicated-bot deployment, routing configuration, and smoke test.

### Skipped
- [ ] Equivalent XP for PA, UHP, forms, nominations, or app usage — intentionally excluded to keep Project Tracker XP product-specific.

### Blocked

None.

## Session History
- 2026-11-02: Confirmed `/topicid` returns `none` only for General & Ideas because it is the renamed default General topic. Updated routing to accept the absent thread ID as `feature_request` traffic while keeping numeric matching for separately created topics. The General topic environment variable must be deleted rather than assigned `none`.
- 2026-11-02: Deployed self-service Telegram disconnect in commit `024d42f8`. The first migration workflow attempt stopped before production access because GitHub rate-limited Supabase CLI release resolution; a safe rerun succeeded. Both Vercel projects completed successfully, and the live owner-only DELETE route returned the expected unauthenticated HTTP 401. The employee account can now disconnect in Settings before the same Telegram identity is linked to the super-admin account.
- 2026-11-02: Docker became available and migration `20261102000001` was applied locally. A rollback-only transaction verified that disconnecting disables Telegram, removes the normalized identity link, clears pending link data, preserves the Gmail preference, and creates an audit event. Production rollout was explicitly approved and is in progress.
- 2026-11-02: Implemented an owner-only, server-confirmed Telegram disconnect action in Settings. The database function atomically deletes `telegram_account_links`, disables Telegram delivery, clears legacy chat details and pending tokens, and writes an audit event. Validation passed: focused Biome check, portal typecheck, API tests 4/4, and Playwright desktop/mobile 2/2 with screenshots inspected. `graphify update .` completed with 14,487 nodes and 35,067 edges. Local database execution remains blocked because Docker Desktop is unavailable; production was not changed.
- 2026-11-02: Registered the dedicated production webhook for `@SNControlHubCommunityBot` using secrets stored in the ignored `apps/web/.env.local`. Telegram confirmed the production URL, `allowed_updates=message`, zero pending updates, and no last error. No existing bot or n8n credential was modified. The next live step is super-admin linking followed by `/topicid` discovery in each Forum topic.
- 2026-11-02: Deployed scoped commit `4b3ebdc0` to production. `sn-connect-portal` and `sn-connect-www` Vercel statuses succeeded, the Supabase migration workflow succeeded, and `POST https://app.sngroup.com.au/api/webhooks/telegram-community` without a secret returned HTTP 401. The super-admin can now link through the existing bot. Telegram `setWebhook` remains pending because production secrets cannot be read back into this local session.
- 2026-11-02: User confirmed the new community-bot production variables are configured and authorized deployment. Corrected the recognition cron ownership from the public-site Vercel config to `apps/web/vercel.json`. Pre-deployment validation passed: portal typecheck, focused Vitest suite (8/8), Vercel JSON parsing, and `pnpm build:web`. A scoped production commit excludes unrelated payroll, payout-test, skill, PDF, and graph-cache worktree changes.
- 2026-11-02: Added a dedicated Forum-bot transport while preserving the existing linking/notification bot and n8n credential. `/topicid` now works for linked admins and super-admins before `TELEGRAM_COMMUNITY_CHAT_ID` is configured, resolving the discovery dependency. Focused validation passed: `pnpm --filter @hr-portal/web typecheck` and `pnpm vitest run tests/api/telegram-community-webhook-route.test.ts tests/lib/telegram-community-webhook.test.ts` (4/4). Production deployment and Telegram webhook registration remain blocked on securely accessible new-bot credentials and a deployment path; no forum command should be treated as live yet.
- 2026-10-24: **How `20261024000001`–`20261024000006` reached production.** They were applied to the linked production project `tccdupkjmwwxcvpqnpeb` unintentionally by the Ask AI reflections session, which ran `pnpm db:migrate` (`supabase db push`, linked project, not local) while intending a local apply; it also applied `20261025000001_create_performance_insight_conversations.sql`. This was not an approved rollout. It included the `okrs`/`kpis` `submitted_at` backfill in `20261024000002` and the `telegram_account_links` backfill in `20261024000006`. No rollback was attempted; the user chose to keep them. Application code for this feature is not yet deployed, so production schema is ahead of production code until rollout. See `docs/features/performance-reflection-insights/task-tracker.md`.
- 2026-10-24: Began production Telegram rollout. Verified Supabase production migrations through `20261024000006`, confirmed the production webhook rejects requests without its secret (`HTTP 401`), registered the n8n MCP with Codex, and successfully tested the existing `Control Hub Notifications` Telegram credential. No n8n Telegram Trigger was added because Telegram permits one bot webhook and the Control Hub app owns it. Rollout remains blocked on the forum chat/topic IDs and application environment routing; Vercel inspection/deployment was skipped at the user's direction.
- 2026-10-24: Implemented and locally validated the end-to-end feature, including immutable OKR/KPI submission timestamps and positive on-time performance evidence. Recognition decisions remain HR-reviewed and server-confirmed. Production rollout and live Telegram verification remain deferred pending explicit approval and credentials.
