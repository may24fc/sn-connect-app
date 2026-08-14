## **Implementation Plan: PA/EA Task Tracker Module**

*Internal Engineering Plan • Draft v1 • August 2026*

Relates to: [pa-productivity-system.md](./pa-productivity-system.md) (Phase 1, Task 1.3 — "Build Notion PA Master Database"). This plan **replaces the Notion database** with a native in-app module inside Control Hub, owned exclusively by PA/EA staff.

---

## 1. What This Is

A **standalone, self-contained module** — not an extension of the existing `tasks` / `task_assignments` system used for general employee task management ([useTasks.ts](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/hooks/useTasks.ts), [task.types.ts](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/packages/ui/src/types/task.types.ts)).

Why separate, not reused:
- The existing `tasks` table is a **manager → staff assignment** system (assigned_by / assigned_to, tied to performance/HR workflows, audited via `audit_logs` triggers on every task).
- The PA/EA tracker is a **self-service log** PAs/EAs maintain themselves to track voice-note-derived action items from Steven (per the parent proposal). Different owner, different lifecycle, different permissions — reusing `tasks` would mean bending its RLS and hook layer to fit a use case it wasn't designed for.
- Keeping it separate means we can freely restructure this module later (e.g. wiring in the n8n/Telegram pipeline from Phase 2 of the parent proposal) without touching the general HR task system.

**Access is restricted to PA/EA members only** — no new database role is introduced. We reuse the existing **feature-access-grant pattern** already used for ATS access ([20260417000002_add_ats_access_grants.sql](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/supabase/migrations/20260417000002_add_ats_access_grants.sql), [useAtsAccess.ts](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/hooks/useAtsAccess.ts)): admins/super_admins grant named `employee`/`associate` users access to this module, and only those users (plus admin/super_admin) can see or use it.

---

## 2. Column / Field Spec (Final)

Carried over from the earlier column-reorder discussion, with **Blockers** added:

| # | Field | Type | Notes |
|---|-------|------|-------|
| 1 | Status | lookup (user-manageable list) | e.g. Not Started, In Progress, Blocked, Waiting, Done |
| 2 | Priority | lookup (user-manageable list) | e.g. Low, Medium, High, Urgent |
| 3 | Task | text (title + optional long description) | Core deliverable |
| 4 | Due Date | date | |
| 5 | Assigned To | user reference | Limited to PA/EA members with module access (see §4) |
| 6 | Category | lookup (user-manageable list) | e.g. Property, Errands, Admin, Personal, Business Unit |
| 7 | Blockers | short text, conditional | Only meaningful when Status = Blocked; full explanation lives in Notes |
| 8 | Waiting On | free text | Not a user reference — per original spec, plain text (e.g. "Vendor", "Accounting") |
| 9 | Notes/Remarks | long text | |
| 10 | Attachments | file upload or link + title | Multiple per entry |
| 11 | Date Given | date (defaults to entry creation date, editable) | |
| 12 | Last Updated | auto-managed timestamp | Not user-editable — set by DB trigger |

**Why lookups instead of hardcoded enums for Status/Priority/Category:** the original request explicitly flagged Status and Priority as "(Can add categories)" — meaning PAs need to add/rename options without an engineer shipping a migration every time. Postgres enums (`CREATE TYPE ... AS ENUM`) can't be edited by end users, so these three fields will be **admin-managed lookup tables** instead of enum types, similar in spirit to `resource_categories`/`departments` rather than the rigid `task_status`/`task_priority` enums on the existing `tasks` table.

---

## 3. Data Model

New tables (all under a `pa_task_` prefix to keep the module self-contained and easy to find/drop later):

```
pa_task_access_grants        -- who can use the module (mirrors ats_access_grants)
pa_task_statuses              -- user-manageable status list
pa_task_priorities            -- user-manageable priority list
pa_task_categories            -- user-manageable category list
pa_tasks                      -- the entries themselves
pa_task_attachments           -- files/links attached to an entry
```

### 3.1 `pa_task_access_grants`
Based on `ats_access_grants`, but with a two-tier `access_level` (see §8.1 for rationale):
```sql
CREATE TABLE public.pa_task_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'contributor' CHECK (access_level IN ('contributor', 'manager')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```
Plus two SQL functions:
- `public.user_has_pa_task_access(uuid)` — true for admin/super_admin, or any active grant row (either level). Gates module entry + `pa_tasks`/`pa_task_attachments` RLS.
- `public.user_can_manage_pa_task_lookups(uuid)` — true for admin/super_admin, or an active grant row with `access_level = 'manager'`. Gates write access to the three lookup tables + the access-grants table itself.

### 3.2 Lookup tables (status / priority / category)
Same shape for all three, e.g.:
```sql
CREATE TABLE public.pa_task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text, -- for badge styling, e.g. 'amber', 'emerald'
  is_default boolean NOT NULL DEFAULT false,
  is_terminal boolean NOT NULL DEFAULT false, -- e.g. "Done"/"Cancelled" — hides from active views
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- pa_task_priorities and pa_task_categories: same shape minus is_terminal
```
Seed migration pre-populates sensible defaults (Status: Not Started, In Progress, Blocked, Waiting, Done, Cancelled; Priority: Low, Medium, High, Urgent) so the table isn't empty on day one — PAs can rename/add from there.

### 3.3 `pa_tasks` (the entries)
```sql
CREATE TABLE public.pa_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status_id uuid NOT NULL REFERENCES public.pa_task_statuses(id),
  priority_id uuid NOT NULL REFERENCES public.pa_task_priorities(id),
  category_id uuid REFERENCES public.pa_task_categories(id),
  assigned_to uuid REFERENCES public.users(id),
  due_date date,
  date_given date NOT NULL DEFAULT current_date,
  blocker_reason text,
  waiting_on text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```
- `updated_at` maintained by a `BEFORE UPDATE` trigger (same pattern as `public.handle_updated_at()`), never set directly by client payloads — matches "Last Updated is system metadata" decided earlier.
- Indexes: `status_id`, `priority_id`, `assigned_to`, `due_date`, `deleted_at` (mirrors indexing style of `tasks`).

### 3.4 `pa_task_attachments`
```sql
CREATE TABLE public.pa_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_task_id uuid NOT NULL REFERENCES public.pa_tasks(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('file', 'link')),
  title text NOT NULL,
  url text,             -- for type='link'
  storage_path text,     -- for type='file', points into a private bucket
  file_size_bytes bigint,
  mime_type text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```
File attachments go into a new private storage bucket `pa-task-attachments` (10MB limit, same allowed_mime_types list as `employee-documents`), following the [20260228000012_create_employee_documents_bucket.sql](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/supabase/migrations/20260228000012_create_employee_documents_bucket.sql) pattern — folder-scoped by `pa_task_id`, readable only by users who pass `user_has_pa_task_access()`.

### 3.5 RLS Summary
All tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
- **`pa_tasks` / `pa_task_attachments`** — SELECT/INSERT/UPDATE gated by `user_has_pa_task_access(auth.uid())` (any grantee, either level, + admin/super_admin). DELETE is soft-delete only, restricted to `created_by = auth.uid()` OR admin/super_admin — matches the `task_proofs` delete pattern.
- **Lookup tables (`pa_task_statuses`/`priorities`/`categories`)** — SELECT gated by `user_has_pa_task_access()` (any grantee can view/use them in the entry form); INSERT/UPDATE/DELETE gated by `user_can_manage_pa_task_lookups()` (manager-level grantees + admin/super_admin only — see §8.1).
- **`pa_task_access_grants`** — SELECT of own row by any user; full manage (INSERT/UPDATE/DELETE, view all rows) gated by `user_can_manage_pa_task_lookups()` as well, so `manager`-level PAs can add/remove other PAs without needing an admin, while `contributor`-level PAs cannot.

---

## 4. Access Model

| Actor | Can access module? | Assignable as "Assigned To"? | Can manage grants + lookups? |
|---|---|---|---|
| `admin` / `super_admin` | Yes (always) | No (admins aren't PA/EA staff) | Yes |
| PA/EA with `manager` grant | Yes | Yes | Yes |
| PA/EA with `contributor` grant | Yes | Yes | No |
| Everyone else | No — module hidden from nav, routes redirect | No | No |

Built on the same mechanism already shipped for ATS, refined with a two-tier grant level (§8.1):
- `public.user_has_pa_task_access(uuid)` — module entry gate, STABLE SQL function.
- `public.user_can_manage_pa_task_lookups(uuid)` — manager-tier gate for lookups + grants.
- `GET /api/pa-tasks/access` → `{ canAccess, canManage, accessLevel, role }` for the current user (drives both the route guard and whether the Settings nav item shows).
- `GET/POST/DELETE /api/pa-tasks/access-grants` — manager-tier management endpoint (admin, or `manager`-level PA/EA), so admins **or** designated senior PAs can add/remove other PA/EA members from a settings screen (mirrors `AtsAccessManagerDialog.tsx`, extended with an access-level picker).

This means **no new `user_role` enum value** and no changes to `AuthContext.tsx`'s role model — access is purely additive via grants, so it can be rolled out without touching existing auth logic.

**"Assigned To" is scoped to PA/EA grantees only** — the assignee `Select` in the entry form and the assignee filter in the table are both populated from `pa_task_access_grants` (contributor + manager), not the full employee directory. If a task needs to go to someone outside the PA/EA team, that's a signal it belongs in the regular `tasks` system instead.

**Admin/CEO default visibility**: since `user_has_pa_task_access()` always passes for `admin`/`super_admin`, they can see every entry from day one with no extra grant needed — satisfying "yes" to default visibility. The cross-person **rollup dashboard** (aggregated/grouped view built for glanceable oversight, akin to the parent proposal's "CEO Dashboard View") is deferred to a v2 — see §10.

---

## 5. API Surface (new routes, all under `apps/web/src/app/api/pa-tasks/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/pa-tasks` | GET | List entries (filters: status, priority, category, **assignee**, search, date range — assignee filter is part of the base build, §8.2) |
| `/api/pa-tasks` | POST | Create entry |
| `/api/pa-tasks/[id]` | GET | Get one entry (with attachments) |
| `/api/pa-tasks/[id]` | PATCH | Update entry |
| `/api/pa-tasks/[id]` | DELETE | Soft delete |
| `/api/pa-tasks/[id]/attachments` | GET/POST | List / add attachment (file upload via signed URL, or link) |
| `/api/pa-tasks/[id]/attachments/[attachmentId]` | DELETE | Remove attachment |
| `/api/pa-tasks/statuses` | GET/POST/PATCH/DELETE | Manage the status lookup list (write ops require `manager` tier) |
| `/api/pa-tasks/priorities` | GET/POST/PATCH/DELETE | Manage the priority lookup list (write ops require `manager` tier) |
| `/api/pa-tasks/categories` | GET/POST/PATCH/DELETE | Manage the category lookup list (write ops require `manager` tier) |
| `/api/pa-tasks/access` | GET | Current user's access status + tier |
| `/api/pa-tasks/access-grants` | GET/POST/DELETE | Grant management, restricted to admin/super_admin + `manager`-tier grantees |
| `/api/pa-tasks/assignable-users` | GET | List of current PA/EA grantees, for the "Assigned To" select |

All validated with new Zod schemas in `apps/web/src/lib/schemas/pa-task.schema.ts`, following the existing [task.schema.ts](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/lib/schemas/task.schema.ts) pattern (`paTaskCreateSchema`, `paTaskUpdateSchema`, partial-of-base convention).

---

## 6. Frontend Architecture

### 6.1 Route
`apps/web/src/app/(employee)/pa-tasks/` (PAs/EAs are `employee` or `associate` role; the `(employee)` route group already serves both — see [tasks/page.tsx](</c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/app/(employee)/tasks/page.tsx>) for precedent). Structure — **confirmed Drawer/Sheet approach**, no `[id]/page.tsx`:
```
(employee)/pa-tasks/
  layout.tsx        -- access guard, mirrors (employee)/ats/layout.tsx
  page.tsx          -- table/list view + "New Entry" trigger + drawer (reads ?taskId= to reopen on load)
  settings/page.tsx -- manage status/priority/category lookups + access grants (manager-tier + admin only)
```

`layout.tsx` calls `usePaTaskAccess(true)`; if `!canAccess` once loaded, redirect to `/dashboard` (or `/associate/dashboard`) — identical logic to [ats/layout.tsx](</c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/app/(employee)/ats/layout.tsx>). The `/pa-tasks/settings` route additionally checks `canManage` from the same hook and redirects `contributor`-tier users back to `/pa-tasks`.

### 6.2 Sidebar
[Sidebar.tsx](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/packages/ui/src/layout/Sidebar.tsx) already supports a conditional nav item pattern via `showAtsAccess`. Add a parallel `showPaTaskAccess` prop, and in the `(employee)` layout wrapper, feed it from `usePaTaskAccess()` the same way `showAtsAccess` is fed from `useAtsAccess()` — so the nav item ("PA Tracker" / `ClipboardList` or `NotebookPen` icon) only appears for grantees and admins.

### 6.3 Components (new, in `apps/web/src/components/pa-tasks/` — app-local, not `packages/ui`, since this is a single-app feature, not a shared design-system primitive)
- `PaTaskEntryForm` — the pop-up form (Dialog) for create/edit, containing all 12 fields in the finalized order. Status/Priority/Category rendered as `Select` populated from the lookup-table hooks; Assigned To populated from `assignable-users`; Blockers field conditionally shown/required when Status = Blocked (mirrors the existing conditional note-input logic in [TaskDetailView.tsx](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/packages/ui/src/components/tasks/TaskDetailView.tsx) lines ~82-90).
- `PaTaskTable` — the list view. Default-visible columns: Status, Priority, Task, Due Date, Assigned To, Blocker indicator (badge/icon only). Filter bar above the table: Status, Priority, Category, **Assignee** (§8.2), search, date range. Everything else (Category detail, Waiting On, Notes, Attachments, Date Given, Last Updated) lives behind a row click.
- `PaTaskDetailSheet` — **confirmed Drawer/Sheet**, opened on row click; full field view + edit entry point. Syncs open/selected state to `?taskId=` in the URL so a link back to `/pa-tasks?taskId=...` reopens the same entry — gives us most of the shareability benefit of a dedicated page without leaving the table-driven flow. Chosen for speed of use since PAs will be logging/checking many small entries in one sitting.
- `PaTaskAttachmentList` / `PaTaskAttachmentUploadDialog` — attach file (via signed upload URL to `pa-task-attachments` bucket) or link+title.
- `PaTaskAccessSettingsDialog` — grant management (admin + `manager`-tier PA/EA), modeled on [AtsAccessManagerDialog.tsx](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/components/admin/AtsAccessManagerDialog.tsx) but extended with a `contributor`/`manager` picker per grant.
- `PaTaskLookupManager` — small CRUD UI (add/rename/reorder/archive) for the Status/Priority/Category lists, manager-tier only.

Badges for Status/Priority/Category will be simple, color-driven from the lookup table's `color` field (can't reuse `TaskStatusBadge`/`TaskPriorityBadge` from `@hr-portal/ui` as-is since those are hardcoded to the fixed `TaskStatus`/`TaskPriority` union types — this module's values are dynamic/user-defined).

### 6.4 Hooks (`apps/web/src/hooks/`)
- `usePaTasks(filters)` — filters include `status`, `priority`, `category`, `assigneeId`, `search`, `dateFrom`/`dateTo`
- `usePaTask(id)`, `useCreatePaTask()`, `useUpdatePaTask(id)`, `useDeletePaTask(id)`
- `usePaTaskStatuses()`, `usePaTaskPriorities()`, `usePaTaskCategories()` (+ mutate variants, manager-tier gated server-side)
- `usePaTaskAssignableUsers()` — powers both the "Assigned To" select and the table's assignee filter dropdown
- `usePaTaskAttachments(taskId)`, `useAddPaTaskAttachment(taskId)`, `useDeletePaTaskAttachment(taskId)`
- `usePaTaskAccess()` (returns `canAccess` + `canManage` + `accessLevel`), `usePaTaskAccessGrants()`, `useGrantPaTaskAccess()`, `useRevokePaTaskAccess()` — copy of `useAtsAccess.ts` retargeted to `/api/pa-tasks/access*`.

New `queryKeys.paTasks` block in [query-keys.ts](/c:/Users/Ivan/Desktop/SN%20Projects/sn-connect-app/apps/web/src/lib/query-keys.ts), same shape as the existing `queryKeys.ats` block.

### 6.5 Types
New file `apps/web/src/types/pa-task.types.ts` (app-local, not `packages/ui`, since — per §1 — this isn't a shared cross-app entity like `Task`). Defines `PaTaskRecord`, `PaTaskStatus`, `PaTaskPriority`, `PaTaskCategory`, `PaTaskAttachment`, `PaTaskFormData`, `PaTaskFilters`, `PaTaskAccessLevel`.

---

## 7. Migration Sequencing

Proposed order (new files under `supabase/migrations/`, `YYYYMMDDHHMMSS_description.sql`):
1. `..._create_pa_task_access_grants.sql` — grants table + `user_has_pa_task_access()` function + RLS
2. `..._create_pa_task_lookup_tables.sql` — statuses/priorities/categories tables + RLS + seed defaults
3. `..._create_pa_tasks_table.sql` — main entries table + RLS + `updated_at` trigger
4. `..._create_pa_task_attachments.sql` — attachments table + RLS
5. `..._create_pa_task_attachments_bucket.sql` — storage bucket + storage RLS policies

Each is independently reversible (drop table/bucket) without touching the existing `tasks` schema — no risk to the current HR task system.

---

## 8. Decisions (confirmed)

1. **Lookup list management (Status/Priority/Category): Admin + the specific PA/EA grantee(s) of choice.** Not "any grantee automatically" — access to *manage* the lookup lists is itself a flag, separate from having module access. In practice this means the `pa_task_statuses`/`priorities`/`categories` RLS write policies check `admin`/`super_admin` **or** a grant row with `access_level` allowing management (see §8.1 for the refined grant model).
2. **Admin/CEO gets default read visibility.** Confirmed — no separate visibility grant needed for admin/super_admin (already covered by `user_has_pa_task_access()` always passing for those roles). A **separate rollup dashboard** (all PA/EA tasks, cross-person view, stats) is scoped as **future work**, tracked in §10 — not part of this initial build.
3. **"Assigned To" is restricted to PA/EA grantees only** (i.e., users who currently hold an active `pa_task_access_grants` row). The assignee `Select` in the entry form is populated from the grants list, not the full employee directory.
4. **Attachments reuse the existing 10MB / office-doc+image allowlist** from `employee-documents` — no larger limits for now. Can be revisited if Phase 2 (Telegram voice notes) needs audio support later.
5. **Detail view uses a Drawer/Sheet**, not a dedicated `[id]` page. Opens on row click, table stays mounted underneath. To keep it lightweight to share/reference internally, the drawer's open state will sync to a `?taskId=` query param (`/pa-tasks?taskId=...`) so a URL can still be copy-pasted to reopen a specific entry directly — without needing a full separate route.

### 8.1 Refined access-grant model (from decision #1)

`pa_task_access_grants.access_level` becomes a real distinction instead of the single `'full'` value copied from ATS:
```sql
access_level text NOT NULL DEFAULT 'contributor' CHECK (access_level IN ('contributor', 'manager'))
```
- **`contributor`** — full CRUD on `pa_tasks` + attachments, can be set as an "Assigned To" target. Cannot edit the Status/Priority/Category lookup lists.
- **`manager`** — everything a contributor can do, **plus** manage the lookup lists (add/rename/reorder statuses, priorities, categories) and manage other users' access grants.
- `admin`/`super_admin` implicitly behave as `manager` everywhere via `user_has_pa_task_access()` / a parallel `user_can_manage_pa_task_lookups()` function, regardless of grant rows.

This directly implements "Admin and the PA/EA of choice" — when granting access to a PA/EA member, the admin picks `contributor` or `manager` per person, rather than it being all-or-nothing.

### 8.2 Assignee filter (table view)

Confirmed as part of the base build (not a later add-on): the `PaTaskTable` includes an **Assignee filter** (dropdown of currently-granted PA/EA members, default "All") alongside Status/Priority/Category filters, wired to `usePaTasks({ assigneeId })`. This lets admin or any grantee instantly narrow the list to one person's open items.

---

---

## 9. Rollout Plan

1. Ship migrations + API + hooks behind the access-grant gate (invisible to everyone until grants exist).
2. Grant access to the PA team members via the admin settings dialog, choosing `contributor` vs `manager` per person.
3. Soft-launch: PAs manually log a week of real entries in parallel with whatever they use today, to validate the field set and lookup defaults before decommissioning any interim tracking.
4. Revisit Phase 2/3 of [pa-productivity-system.md](./pa-productivity-system.md) (Telegram bot + n8n auto-population) as a **separate follow-up integration** once the manual module is validated — the API surface in §5 is designed so an n8n workflow could POST directly to `/api/pa-tasks` later without UI changes.

---

## 10. Future Work (explicitly out of scope for this build)

- **Cross-person rollup dashboard** — a read-only, admin/CEO-facing view showing all PA/EA entries across every person at once (grouped by assignee, overdue highlighted, blocked flagged), analogous to the "Notion CEO Dashboard View" in the parent proposal's Task 1.4. This is a natural v2 on top of the same `pa_tasks` data — no schema changes anticipated, just a new aggregate query + view component. Deferred so the base module ships faster and the field/lookup structure can be validated first with real usage.
- **Telegram/n8n voice-note pipeline** (parent proposal Phases 2–3) — auto-creating entries from Steven's voice notes, EOD reminders, overdue escalation alerts. The API in §5 is intentionally shaped so this can plug in later without UI rework.
