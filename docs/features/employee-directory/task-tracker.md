# Employee Directory Task Tracker

## Current Status

Former Employees tab now supports editing a termination date and permanently deleting a terminated account. Implemented and typechecked; not yet exercised against a running local Supabase.

## Tasks

### Done
- [x] Edit Termination Date action on the Former Employees tab - 2026-10-06; changed `apps/web/src/app/(app)/(admin)/admin/directory/page.tsx`, `apps/web/src/app/api/users/[id]/route.ts`; validated with `pnpm --filter web typecheck`. `PATCH /api/users/[id]` now accepts `{ date_terminated: 'YYYY-MM-DD' }` (Zod union with the existing `{ status }` body), admin/super-admin only, terminated accounts only, rejects future dates and dates before `date_hired`, stores midday UTC so the calendar day is stable across timezones, writes an `update_termination_date` audit entry. Client mutation is optimistic with rollback (classified per `docs/apps/web/architecture/optimistic-ui.md`: confirmed inline edit, like the other Directory edits).
- [x] Delete Permanently action on the Former Employees tab - 2026-10-06; changed `apps/web/src/app/(app)/(admin)/admin/directory/page.tsx`; added `apps/web/src/app/api/users/[id]/permanent/route.ts`; validated with `pnpm --filter web typecheck`. `DELETE /api/users/[id]/permanent` removes the auth user (cascading `public.users` and `employees`) via the admin client after an explicit role check. Terminated accounts only; cannot delete self; deleting an admin/super-admin account requires super admin. Audit entry `permanently_delete_user` records only the id and role. Client mutation is server-confirmed (irreversible, DB can reject) and the dialog requires typing `DELETE`.

- [x] Permanent delete works regardless of linked records - 2026-10-06; added `supabase/migrations/20261006000002_create_purge_directory_user.sql` (`public.purge_directory_user`, SECURITY DEFINER, service_role only); changed `apps/web/src/app/api/users/[id]/permanent/route.ts` and the dialog copy in `apps/web/src/app/(app)/(admin)/admin/directory/page.tsx`. Decision (user): delete personal data, keep shared work others rely on, still showing the person's name. Implementation: route bans the auth user and swaps its email for `deleted-<id>@deleted.invalid`, then the function deletes personal rows (notifications, grants, self-evaluations, gamification, bank info, profile change requests, onboarding, personal documents except expense receipts, etc.), reduces `employees`/`users` to a name-only stub (`users.deleted_at` set, hidden from `employee_directory`), and nulls `audit_logs` snapshots for the purged rows (the `handle_audit_log` trigger stores whole rows). Validation: migration applied locally; rolled-back SQL test (refuses non-terminated, purges, hides, clears audit snapshots, refuses re-run, `authenticated` cannot execute); end-to-end with a throwaway local auth user (login refused as banned, stub hidden, cleanup ok); `tsc --noEmit` clean for changed files.

- [x] Apply `20261006000002_create_purge_directory_user.sql` to local and production - 2026-10-06 (user approved both); local via `supabase migration up --local` earlier; production via `supabase db push --linked` (project `tccdupkjmwwxcvpqnpeb`, it was the only pending migration per `--dry-run`). Verified with `supabase migration list --linked` (recorded on both sides) and two read-only RPC calls with a nonexistent id: service role gets the expected `P0002` refusal (function live, nothing deleted), anon gets `42501 permission denied`. No real account was purged or tested on production.

### In Progress

None.

### Deferred
- [ ] Runtime verification against local Supabase and automated tests - Deferred: no test coverage exists for `/api/users/[id]`, and the local stack was not started this session. Resume: `pnpm supabase:start`, then exercise both endpoints (date edit incl. validation errors; delete of an account with and without linked records) and add route tests.
- [ ] Storage cleanup on permanent delete (avatar and uploaded files) - Deferred: the delete only removes database/auth rows. Resume: decide whether orphaned storage objects should be removed in the same request or by a sweep job.

### Skipped

None.

### Blocked

None.

## Known Risks
- Superseded: permanent delete no longer hard-deletes rows, so the ~112 NO ACTION foreign keys (to `users`, `employees`, `auth.users`) no longer block it.
- The personal-data delete list in `purge_directory_user` is explicit. New tables holding per-user personal data must be added to it, or they will survive a purge.
- Shared records kept on purge include tickets and their comments, company events, project documentation, and AI expenses, which the schema would otherwise have cascaded.
- Edit Termination Date is hidden for former entries with no employee record (e.g. accounts that never completed onboarding); they can still be restored or deleted.

## Session History
- 2026-10-06 (later): Reworked Delete Permanently so linked records never block it, per the user's instruction to delete regardless while keeping names on records others rely on. Migration then approved and applied to production.
- 2026-10-06: Added Edit Termination Date and Delete Permanently to the Former Employees tab. Decisions: separate `/permanent` route so the existing `DELETE /api/users/[id]` (terminate) keeps its meaning; hard delete rather than soft delete because "permanently" was requested, guarded by terminated-only, role checks, typed confirmation, and DB-level rollback on linked records. Validation: typecheck only. Remaining: runtime verification, tests, storage cleanup. The working tree also held unrelated uncommitted changes from other work (report schemas/hooks, authentication docs) that this session did not touch.
