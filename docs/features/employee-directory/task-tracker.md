# Employee Directory Task Tracker

## Current Status

Former Employees tab now supports editing a termination date and permanently deleting a terminated account. Implemented and typechecked; not yet exercised against a running local Supabase.

## Tasks

### Done
- [x] Edit Termination Date action on the Former Employees tab - 2026-10-06; changed `apps/web/src/app/(app)/(admin)/admin/directory/page.tsx`, `apps/web/src/app/api/users/[id]/route.ts`; validated with `pnpm --filter web typecheck`. `PATCH /api/users/[id]` now accepts `{ date_terminated: 'YYYY-MM-DD' }` (Zod union with the existing `{ status }` body), admin/super-admin only, terminated accounts only, rejects future dates and dates before `date_hired`, stores midday UTC so the calendar day is stable across timezones, writes an `update_termination_date` audit entry. Client mutation is optimistic with rollback (classified per `docs/apps/web/architecture/optimistic-ui.md`: confirmed inline edit, like the other Directory edits).
- [x] Delete Permanently action on the Former Employees tab - 2026-10-06; changed `apps/web/src/app/(app)/(admin)/admin/directory/page.tsx`; added `apps/web/src/app/api/users/[id]/permanent/route.ts`; validated with `pnpm --filter web typecheck`. `DELETE /api/users/[id]/permanent` removes the auth user (cascading `public.users` and `employees`) via the admin client after an explicit role check. Terminated accounts only; cannot delete self; deleting an admin/super-admin account requires super admin. Audit entry `permanently_delete_user` records only the id and role. Client mutation is server-confirmed (irreversible, DB can reject) and the dialog requires typing `DELETE`.

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
- Roughly 47 foreign keys reference `public.users(id)` without `ON DELETE`. Permanent delete of an account with such records is rejected by Postgres; the route returns 409 and the account stays in Former Employees. The ~38 `ON DELETE CASCADE` tables are deleted with the user, so permanent delete is destructive for those records.
- Edit Termination Date is hidden for former entries with no employee record (e.g. accounts that never completed onboarding); they can still be restored or deleted.

## Session History
- 2026-10-06: Added Edit Termination Date and Delete Permanently to the Former Employees tab. Decisions: separate `/permanent` route so the existing `DELETE /api/users/[id]` (terminate) keeps its meaning; hard delete rather than soft delete because "permanently" was requested, guarded by terminated-only, role checks, typed confirmation, and DB-level rollback on linked records. Validation: typecheck only. Remaining: runtime verification, tests, storage cleanup. The working tree also held unrelated uncommitted changes from other work (report schemas/hooks, authentication docs) that this session did not touch.
