# Workspace-Only Access Task Tracker

## Current Status

Implementation and migration rollout are complete. Focused application checks pass, and migration
`20261029000001_workspace_only_accounts.sql` is applied to both local Supabase and production project
`tccdupkjmwwxcvpqnpeb`.

## Tasks

### Done
- [x] Add a non-workforce workspace identity and per-workspace read/write grants - 2026-10-29; `supabase/migrations/20261029000001_workspace_only_accounts.sql`, `apps/web/src/lib/workspace-access.ts`; web type-check passed.
- [x] Add server-confirmed invite, grant replacement, listing, and revocation in Account Inventory - 2026-10-29; `apps/web/src/app/api/account-inventory/workspace-accounts/route.ts`, `apps/web/src/app/(app)/(admin)/super-admin/account-inventory/page.tsx`; focused desktop/mobile Playwright checks passed.
- [x] Deliver temporary credentials through both the invite email and a one-time inviter dialog - 2026-10-29; `apps/web/src/lib/email.ts`, `apps/web/src/app/(app)/(admin)/super-admin/account-inventory/page.tsx`, `e2e/account-inventory.spec.ts`; focused Account Inventory Playwright check passed and screenshot was inspected.
- [x] Default-deny cross-workspace requests and read-only mutations - 2026-10-29; `apps/web/middleware.ts`; focused middleware tests passed.
- [x] Connect workspace-only identities to SFO, PA, UHP, and Property authorization contexts and navigation - 2026-10-29; CRM, marketing, revenue forecast, PA, UHP, finance auth, bootstrap, shell, and sidebar paths; web type-check and focused sidebar tests passed.
- [x] Validate and deploy the database migration - 2026-10-29; local `pnpm exec supabase migration up --local` applied only `20261029000001_workspace_only_accounts.sql`; production dry-run listed only that migration, production push completed, and a second dry-run reported the remote database is up to date.
- [x] Complete production build validation - 2026-10-29; `pnpm build` passed for all workspace packages and applications after rerunning outside the Windows process sandbox.

### In Progress

### Deferred

### Skipped

### Blocked

## Session History
- 2026-10-29: Added reusable workspace-only accounts with `internal`, `pa`, `sfo`, `uhp`, and `property` grants, read/write enforcement, Account Inventory management, dedicated navigation, workspace authorization integration, invitation email credentials, and a one-time inviter credential dialog. Validated with `pnpm --filter @hr-portal/web typecheck`, 27 focused Vitest assertions, focused desktop/mobile Account Inventory Playwright checks, and the full `pnpm build`. Started local Supabase with `pnpm supabase:start`, applied the migration locally, then dry-ran and applied only `20261029000001_workspace_only_accounts.sql` to production; the post-deploy dry-run reported production up to date.
