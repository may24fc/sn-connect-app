# Controlled Reviewer Access Task Tracker

## Current Status

Core identity classification, workforce filtering, reviewer authorization, synthetic Review Hub, account inventory, and local validation are implemented and verified. External Demo/Review infrastructure and production account remediation remain intentionally undeployed.

Optimization and measurement details: [optimization.md](optimization.md).

## Tasks

### Done
- [x] Add first-class account populations and workforce eligibility - 2026-10-15; `supabase/migrations/20261015000002_controlled_reviewer_access.sql`; applied to local Supabase and validated with `tests/sql/controlled-reviewer-access-local.sql`.
- [x] Exclude reviewer/test/service identities from the shared Directory and historical performance roster inputs - 2026-10-15; workforce-only `employee_directory`, `is_workforce_account`, and `is_quarter_workforce_eligible`; directory/performance focused tests passed.
- [x] Add environment-gated reviewer authorization and seven-day engagements - 2026-10-15; middleware, auth bootstrap, invitation/session/expiry endpoints, and default-deny review API checks; typecheck and auth tests passed.
- [x] Add curated synthetic Review Hub and structured feedback - 2026-10-15; `/review`, review item/feedback APIs, synthetic seed records; TypeScript validation passed.
- [x] Add restricted non-workforce Account Inventory and guarded reset/classification tooling - 2026-10-15; `/super-admin/account-inventory`, `/api/account-inventory`, `pnpm review:reset`, and `pnpm accounts:classification-report`; local report found zero ambiguous accounts.
- [x] Complete UI and latency validation - 2026-10-15; Playwright checked reviewer and super-admin flows at 1440px and 390px, including sandbox mutations, feedback, long content, expiry, and Account Inventory. Five tests passed and screenshots were inspected. Local 30-sample p50 changes were Directory +24.7 ms, Performance +18.3 ms, and Dashboard control +13.3 ms; environmental drift makes the feature-specific delta inconclusive.

- [x] Fix scheduled expiry for Vercel Cron - 2026-10-15; `apps/web/src/app/api/cron/review-expire/route.ts` previously exported only `POST`, but Vercel Cron issues `GET`, so a scheduled run would have returned 405 and never banned expired reviewers. It now exports `GET` and `POST` sharing one handler; `tests/api/review-expire-cron.test.ts` (4 tests: environment gate, secret gate, GET expiry/ban, POST) passed.
- [x] Write the review deployment runbook - 2026-10-15; [deployment-runbook.md](deployment-runbook.md) covers the Supabase/Vercel setup, env vars, cron, seeding, smoke test, invitation, and rollback. Documentation only; nothing was provisioned.
- [x] Apply `20261015000002_controlled_reviewer_access.sql` to local and production - 2026-10-15; local: `migration list --local` shows it, `migration up --local` reports up to date, and `tests/sql/controlled-reviewer-access-local.sql` returns `controlled_reviewer_access_local_ok`. Production (`tccdupkjmwwxcvpqnpeb`): the `employee_directory` view differs from the live `20261015000001` definition only by the appended `account_kind` column and the `account_kind = 'workforce'` filter (the rest is reformatting); `db push --linked --dry-run` listed only this migration, `db push --linked` applied it, and `migration list --linked` shows it on both sides. Existing accounts default to `workforce`; `latency-bench@example.com` is reclassified `test`.
- [x] Resolve production classification anomalies - 2026-10-15; the read-only production report found 2 `employee`-role `workforce` accounts with no employee profile. One was already soft-deleted (an abandoned onboarding from April) and needs no change. The other was a terminated, not-deleted orphan that appeared as a blank row in the directory view; on the owner's instruction it was soft-deleted (`users.deleted_at` set, the reversible repo convention) and its auth login banned, with an `audit_logs` entry (`account_soft_deleted_by_owner_request`). Validation: the account no longer appears in `employee_directory`. No `account_kind` values were changed and no row was hard-deleted; restore by clearing `deleted_at` and the auth ban.

### In Progress
- [ ] None.

### Deferred
- [ ] Provision the isolated Demo/Review deployment and Supabase project - requires owner-controlled Vercel/Supabase project creation, secrets, custom URL, and scheduled `/api/cron/review-expire`; resume when deployment access is explicitly provided, following [deployment-runbook.md](deployment-runbook.md).
- [ ] Disable and audit the real Accounting tester and production latency account - production changes require an explicit production remediation request; resume with the exact account IDs and approved retention/audit window. The migration is now in production, so the accounts can be classified.

### Skipped
- [ ] Copy or anonymize production data into the demo - intentionally skipped because the approved design requires purpose-built synthetic data; reconsider only if a formal privacy review changes that policy.

### Blocked
- [ ] None.

## Session History
- 2026-10-15 (anomalies): Identified both flagged production accounts read-only. Took no action on the already-deleted one. Soft-deleted the active orphan and banned its login on the owner's instruction, with an audit entry. Verified it left the directory view. The Accounting tester and latency-account item is unchanged (the latency account is already `test`).
- 2026-10-15 (migration): Applied `20261015000002` locally (already present; SQL assertions re-run) and to production after a dry run listed only that migration. Code depending on it can now be pushed. The read-only production classification report was then run and found 2 accounts needing review (see Deferred); nothing was changed. The migration also set `latency-bench@example.com` to `test`, which removes it from production directory and performance views. No other production data was read or changed.
- 2026-10-15 (follow-up): Re-verified typecheck and auth tests. Found and fixed the GET/POST cron mismatch above, added its test, and wrote the deployment runbook. Did not run the production classification report (the production schema lacks the column the script reads) and did not push or deploy anything. Remaining risk: the migration is not yet in production, and the repo's delivery gate forbids pushing code that depends on an unapplied migration.
- 2026-10-15: Implemented and locally verified the schema, authorization boundary, reviewer APIs, synthetic Review Hub, Account Inventory, and reset/report tooling. Typecheck, 19 focused unit/API tests, SQL assertions, and five Playwright tests passed. No production or external deployment was changed. Remaining risks are external environment provisioning and explicit production remediation.
