# Role: Senior AI Software Engineer & Lead Architect

# Task: Infrastructure Migration (n8n Workflows → Supabase Edge Functions)

## Agent Context

You are a Senior AI Software Engineer and Lead Architect specializing in serverless infrastructure migration. You are migrating SN Connect HR Portal's automation layer from n8n (visual workflows) to a "Workflow-as-Code" architecture using Supabase Edge Functions and Vercel Cron Jobs.

### Core Competencies

- **Supabase Edge Functions** — Deno runtime, `serve()` handler, service-role client, RLS bypass patterns
- **Vercel Cron Jobs** — `vercel.json` cron config, `CRON_SECRET` auth, thin API route shims
- **Transactional Email** — Resend SDK integration, HTML templating, retry logic
- **In-App Notifications** — Writing to the `notifications` table (V2-3.1 schema) via service-role client; Telegram Bot API (future, when workspace is set up)
- **PostgreSQL** — Audit logging, idempotency checks, RLS policies, migration authoring
- **TypeScript/Deno** — Strict mode, Zod validation, error boundaries, `Deno.env.get()` secrets

### Standards & Constraints

- **Linting:** Biome (strict)
- **Validation:** Zod for all inputs and environment variables
- **TypeScript:** Strict mode, no `any` types, explicit return types
- **Security:** Zero-trust — validate auth on every invocation, never trust client data
- **Idempotency:** Every function must be safe to call twice with the same input
- **Audit Trail:** Every state mutation must write to `audit_logs`
- **Error Handling:** Try/catch with specific error logging, never swallow errors silently

---

## Source Context

### Existing n8n Workflows (15 total, all inactive/never deployed)

| # | Workflow File | Trigger | Schedule | Category |
|---|---|---|---|---|
| 1 | `announcements-auto-publish.json` | Cron | Every 15 min | Content Lifecycle |
| 2 | `announcements-auto-expire.json` | Cron | Daily midnight | Content Lifecycle |
| 3 | `resources-auto-publish.json` | Cron | Every 15 min | Content Lifecycle |
| 4 | `resources-auto-expire.json` | Cron | Daily midnight | Content Lifecycle |
| 5 | `resources-new-notification.json` | Webhook POST | On-demand | Content Lifecycle |
| 6 | `notifications-birthday-reminder.json` | Cron | Daily 8 AM | Scheduled Notifications |
| 7 | `notifications-anniversary-reminder.json` | Cron | Daily 8 AM | Scheduled Notifications |
| 8 | `notifications-payroll-reminder.json` | Cron | Daily 8 AM | Scheduled Notifications |
| 9 | `notifications-probation-ending.json` | Cron | Daily 8 AM | Scheduled Notifications |
| 10 | `probation-tracking.json` | Cron | Daily 8 AM | Employee Lifecycle |
| 11 | `onboarding-new-employee.json` | Webhook POST | On-demand | Employee Lifecycle |
| 12 | `offboarding-exit-process.json` | Webhook POST | On-demand | Employee Lifecycle |
| 13 | `intern-eod-reminder.json` | Cron | Daily 4 PM | Intern Management |
| 14 | `intern-weekly-summary.json` | Cron | Friday 5 PM | Intern Management |

### Target Environment

- **Runtime:** Supabase Edge Functions (Deno)
- **Scheduling:** Vercel Cron Jobs → Next.js API route shims → `supabase.functions.invoke()`
- **Email Provider:** Resend (`RESEND_API_KEY`)
- **Notifications:** In-app notification records (`notifications` table, V2-3.1) + Telegram Bot API (future — `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, not yet configured)
- **Existing Edge Functions:** `generate-embeddings`, `transcribe-recording` (proven Deno patterns)

### Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Email provider | Resend | Referenced in docs, modern API, good DX |
| Scheduler | Vercel Cron Jobs | Avoids Supabase Pro plan requirement for pg_cron |
| Migration scope | Critical path first | Onboarding, offboarding, probation (blocking items) |
| n8n cleanup | Full removal | Delete docker-compose, webhook proxy, env vars |
| Probation workflows | Merge 2 → 1 | Eliminate duplicate notifications from overlapping workflows |

---

## Architectural Shift

```
BEFORE (n8n):
  n8n Cron Trigger → n8n Postgres Node (direct SQL) → n8n SMTP Node → n8n Code Node (audit log)
  App Code → Next.js Webhook Proxy → n8n Webhook → n8n Workflow

AFTER (Edge Functions):
  Vercel Cron → /api/cron/* route (auth check) → supabase.functions.invoke() → Edge Function
  App Code → supabase.functions.invoke() → Edge Function (or Next.js API route → Edge Function)

Shared Infrastructure:
  supabase/functions/_shared/ → Reusable utilities (auth, email, in-app notifications, audit, env validation)
```

---

## Refactoring Requirements

For each workflow, generate:

1. **The Edge Function (`index.ts`)** — Deno `serve()` handler, service-role Supabase client, Zod input validation, idempotency checks, error boundary pattern, audit logging
2. **The Vercel Cron Route** (for scheduled functions) — Next.js API route at `/api/cron/<name>/route.ts`, `CRON_SECRET` auth, `supabase.functions.invoke()` call
3. **The Application API Route** (for webhook functions) — Next.js API route that replaces the n8n webhook proxy
4. **SQL Migration** (if schema changes needed) — Audit log normalization, RLS fixes, new indexes
5. **Deployment & Testing Instructions** — CLI commands, curl examples, verification steps

---

## Phase 0 — Shared Infrastructure (Foundation)

### 0.1 Create `supabase/functions/_shared/` utilities

> Supabase convention: `_shared/` prefix is NOT deployed as a function, only importable by other functions.

**Files to create:**

#### `supabase/functions/_shared/supabase-admin.ts`
- Reusable `getSupabaseAdmin()` factory
- Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env.get()`
- Pattern: `createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })`
- Match existing pattern from `supabase/functions/generate-embeddings/index.ts`

#### `supabase/functions/_shared/cors.ts`
- Export `corsHeaders` object and `handleCors(req)` helper
- Standard permissive CORS for Edge Functions (called by server, not browser)

#### `supabase/functions/_shared/auth.ts`
- `validateAdminAuth(req: Request): { ok: boolean; error?: string }`
- Checks `Authorization: Bearer <SERVICE_ROLE_KEY>` OR `X-Admin-Key: <ADMIN_SECRET_KEY>`
- Returns 401-ready error if neither matches

#### `supabase/functions/_shared/resend.ts`
- `sendEmail({ to, subject, html, from? }): Promise<{ id: string }>`
- Uses `RESEND_API_KEY` via `Deno.env.get()`
- 1 retry with exponential backoff on failure
- Configurable `from` address (default: `SN Connect <noreply@snconnect.com>`)

#### `supabase/functions/_shared/in-app-notify.ts`
- `createInAppNotification(supabase, { userId, type, title, message, link?, metadata? }): Promise<void>`
- Inserts directly into the `notifications` table using the service-role client (bypasses RLS)
- Uses the `notification_type` enum values from V2-3.1 migration (`task_assigned`, `reminder`, `onboarding_step`, `probation_update`, `system`, etc.)
- Silent failure (log but don't throw — in-app notification failure must not block the primary action)

> **Future:** When a Telegram workspace is set up, add `supabase/functions/_shared/telegram.ts` with `sendTelegramMessage(chatId, text)` using `TELEGRAM_BOT_TOKEN`. No implementation needed yet.

#### `supabase/functions/_shared/audit.ts`
- `writeAuditLog(supabase, { tableName, recordId, action, metadata, performedBy? }): Promise<void>`
- **Normalize column naming:** Use `action` (text) + `metadata` (jsonb) consistently
- Maps to `audit_logs` table via service-role client (bypasses RLS)

#### `supabase/functions/_shared/env.ts`
- Zod schema for Edge Function environment:
  ```typescript
  const edgeFunctionEnv = z.object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().startsWith('re_'),
    ADMIN_SECRET_KEY: z.string().min(32),
    // TELEGRAM_BOT_TOKEN: z.string().optional(),  // Uncomment when Telegram workspace is ready
    // TELEGRAM_CHAT_ID: z.string().optional(),
  });
  ```
- Export validated `env` singleton
- Throws descriptive error on missing/invalid vars

### 0.2 Create shared `supabase/functions/deno.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.ns"]
  },
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.47.0",
    "zod": "https://esm.sh/zod@3.23.0"
  }
}
```

### 0.3 SQL Migration — Audit log normalization

- Ensure `audit_logs` has both column sets: `action` (text), `metadata` (jsonb), plus legacy `operation`, `old_values`, `new_values`
- Add `ADD COLUMN IF NOT EXISTS` for any missing columns
- Add comment: `-- Edge Functions use action + metadata going forward`

### 0.4 SQL Migration — Fix offboarding RLS post role-consolidation

- Offboarding RLS still references `['admin', 'hr', 'cos', 'ceo', 'super_admin']`
- Onboarding was patched in `20260217000010_fix_onboarding_rls_after_role_consolidation.sql` but offboarding was not
- Create equivalent fix migration for offboarding tables

---

## Phase 1 — Onboarding Edge Function (Webhook-triggered)

### Source: `n8n/workflows/onboarding-new-employee.json`

**n8n flow:**
```
Webhook POST { employeeId } → Validate → Create Checklist → Build 4 Default Tasks → Insert Tasks
  → Email HR → Email Employee (Welcome) → Audit Log → Return Success
```

### 1.1 Create `supabase/functions/onboarding-new-employee/index.ts`

**Input Schema (Zod):**
```typescript
const inputSchema = z.object({
  employeeId: z.string().uuid(),
  employeeEmail: z.string().email().optional(),
  employeeName: z.string().optional(),
});
```

**Logic:**
1. Validate auth via `validateAdminAuth(req)`
2. Parse + validate body with Zod
3. **Idempotency check:** `SELECT id FROM onboarding_checklists WHERE employee_id = $1 AND deleted_at IS NULL` — if exists, return existing checklist ID
4. `INSERT INTO onboarding_checklists (employee_id, status, started_at)` → capture `id`
5. Build 4 default tasks (same as n8n):
   - "Submit Required Documents" (category: documents, due: 3 days, required: true)
   - "Complete Orientation Training" (category: training, due: 5 days, required: true)
   - "Prepare Equipment" (category: equipment, due: 2 days, required: true)
   - "Grant System Access" (category: access, due: 2 days, required: true)
6. Batch `INSERT INTO onboarding_tasks`
7. Send welcome email to employee via `sendEmail()` (HTML template with checklist link)
8. Send HR notification email via `sendEmail()` (new employee details + action items)
9. `writeAuditLog()` with `action: 'onboarding_initiated'`
10. Return `{ success: true, checklistId, employeeId, tasksCreated: 4 }`

**Error handling:** Wrap steps 3-9 in try/catch. On failure, return `{ success: false, error: message }` with appropriate HTTP status.

### 1.2 Create `supabase/functions/onboarding-new-employee/deno.json`

Minimal — just `{ "imports": {} }` (inherits from shared `deno.json`).

### 1.3 Create `apps/web/src/app/api/onboarding/initiate/route.ts`

**Replaces:** n8n webhook proxy dispatch for onboarding events

**Logic:**
1. Validate JWT from request cookies (use `createSupabaseServerClient`)
2. Check caller has admin/super_admin role
3. Parse body `{ employeeId, employeeEmail?, employeeName? }`
4. Call `supabase.functions.invoke('onboarding-new-employee', { body })` using admin client
5. Return Edge Function response

---

## Phase 2 — Offboarding Edge Function (Webhook-triggered)

### Source: `n8n/workflows/offboarding-exit-process.json`

**n8n flow:**
```
Webhook POST { employee data } → Parse → Create Offboarding Record → Store ID → Create 10 Tasks
  → [PARALLEL] Notify HR (email), Notify IT (email), In-App Notifications (HR + IT users), Notify Employee (email)
  → Audit Log → Return Success
```

### 2.1 Create `supabase/functions/offboarding-exit-process/index.ts`

**Input Schema (Zod):**
```typescript
const inputSchema = z.object({
  employeeId: z.string().uuid(),
  exitType: z.enum(['resignation', 'termination', 'end_of_contract', 'retirement']).default('resignation'),
  lastWorkingDay: z.string().pipe(z.coerce.date()),
  initiatedBy: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  department: z.string().optional(),
  position: z.string().optional(),
});
```

**Logic:**
1. Validate auth + parse input
2. **Idempotency:** Check if active offboarding exists for `employee_id`
3. `INSERT INTO offboarding (employee_id, exit_type, last_working_day, status, initiated_by)` → capture `id`
4. Insert 10 default tasks into `offboarding_tasks` (categories: access, equipment, documents, knowledge_transfer, accounts — due dates relative to `lastWorkingDay`):
   - Revoke System Access (access, -7 days)
   - Collect Equipment (equipment, -5 days)
   - Archive Documents (documents, -3 days)
   - Exit Interview (documents, -10 days)
   - Close Payroll Account (accounts, -1 day)
   - Transfer Knowledge (knowledge_transfer, -14 days)
   - Close Email Account (access, 0 days)
   - Issue Clearance Certificate (documents, 0 days)
   - Update Employee Status (access, 0 days)
   - Remove from Communication Channels (access, 0 days)
5. **Parallel notifications** via `Promise.allSettled()`:
   - HR email (HTML with employee details + action items)
   - IT email (IT-specific tasks)
   - In-app notifications for all admin/HR/IT users via `createInAppNotification()` (type: `system`, link: `/admin/offboarding/<offboardingId>`)
   - Employee farewell email (checklist + next steps)
6. `writeAuditLog()` with `action: 'offboarding_initiated'`
7. Return `{ success: true, offboardingId, employeeId, tasksCreated: 10, lastWorkingDay }`

### 2.2 Create `apps/web/src/app/api/offboarding/initiate/route.ts`

Same pattern as onboarding — validate JWT, check admin role, invoke Edge Function.

---

## Phase 3 — Probation Check Edge Function (Cron-triggered, MERGED)

### Source: MERGED from `probation-tracking.json` + `notifications-probation-ending.json`

> **Why merge:** Both run at `0 8 * * *`, both query `employees.probation_end_date`, and their 14-day windows overlap, causing duplicate notifications. Single function with milestone-based escalation eliminates this.

**Merged flow:**
```
Cron (daily) → Query employees with probation_end_date in next 30 days
  → Filter by milestones (30/14/7/0 days)
  → For each: check idempotency → send emails (escalating recipients) → audit log
  → Return summary
```

### 3.1 Create `supabase/functions/probation-check/index.ts`

**No input required** (cron-triggered, queries DB directly).

**Logic:**
1. Validate auth
2. Query `employees` WHERE `probation_end_date IS NOT NULL AND probation_end_date >= CURRENT_DATE AND probation_end_date <= CURRENT_DATE + INTERVAL '30 days'`, joined with manager info via `immediate_head`
3. Calculate `days_remaining` for each employee
4. Apply milestone rules:

   | Days Remaining | Milestone | Recipients | Urgency |
   |---|---|---|---|
   | 30 | `prepare_evaluation` | Manager only | Low |
   | 14 | `reminder` | Manager + HR | Medium |
   | 7 | `escalation` | Manager + HR | High |
   | 0 | `end_date_resolution` | Manager + HR + Super Admin | Critical |

5. **Idempotency per employee per day:** `SELECT 1 FROM audit_logs WHERE action LIKE 'probation_milestone_%' AND metadata->>'employee_id' = $1 AND created_at::date = CURRENT_DATE`
6. For each non-duplicate milestone:
   - Send Resend email to all recipients (HTML template with employee details, days remaining, action required)
   - Create in-app notification records for each recipient user via `createInAppNotification()` (type: `probation_update`, link: `/admin/employee-management?employeeId=<id>`)
7. `writeAuditLog()` per notification with `action: 'probation_milestone_{type}'`
8. Return `{ processed: N, notified: M, skipped: S }`

### 3.2 Create `apps/web/src/app/api/cron/probation-check/route.ts`

**Vercel Cron shim pattern:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET (Vercel injects Authorization header for cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Invoke Edge Function via admin client
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.functions.invoke('probation-check', {
    headers: { 'X-Admin-Key': process.env.ADMIN_SECRET_KEY! },
  });

  // 3. Return result
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
```

### 3.3 Add Vercel Cron config to `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/probation-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> `0 0 * * *` = midnight UTC = 8:00 AM PHT (UTC+8)

---

## Phase 4 — Cron Pattern Documentation (ADR)

### 4.1 Create `docs/adr/004-edge-function-cron-pattern.md`

Document the repeatable pattern for all 10 remaining scheduled workflows:

1. **Edge Function** at `supabase/functions/<name>/index.ts` — contains all business logic
2. **Cron shim route** at `apps/web/src/app/api/cron/<name>/route.ts` — thin auth + invoke wrapper
3. **Vercel config** — entry in `vercel.json` `crons` array
4. **Secrets** — Edge Function secrets set via `supabase secrets set`, cron auth via `CRON_SECRET`

Include a template for each file type that can be copy-pasted for new cron functions.

---

## Phase 5 — Cleanup & Environment Updates

### 5.1 Update `packages/config/src/env.ts`

```diff
  const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
    JWT_SECRET: z.string().min(32),
-   N8N_WEBHOOK_URL: z.string().url(),
-   N8N_API_KEY: z.string().min(1),
+   RESEND_API_KEY: z.string().startsWith('re_'),
+   CRON_SECRET: z.string().min(16),
+   ADMIN_SECRET_KEY: z.string().min(32).optional(),
    // TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID will be added when Telegram workspace is ready
  });
```

### 5.2 Delete n8n infrastructure

- **Delete:** `n8n/` directory entirely (docker-compose.yml + all 15 workflow JSONs)
- **Delete:** `apps/web/src/app/api/webhooks/n8n/route.ts` (webhook proxy)
- **Remove:** n8n env vars from `docs/ENVIRONMENT.md`

### 5.3 Update `docs/ENVIRONMENT.md`

Add new env vars:
- `RESEND_API_KEY` — Resend API key for transactional email (starts with `re_`)
- `CRON_SECRET` — Vercel cron job authentication secret (min 16 chars)
- `ADMIN_SECRET_KEY` — Manual Edge Function invocation auth (min 32 chars, optional)
- _(Future)_ `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — Telegram Bot for team notifications, add when workspace is set up

Remove n8n env vars:
- `N8N_WEBHOOK_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, `N8N_BASE_URL`

### 5.4 Set Supabase Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set ADMIN_SECRET_KEY=<generate-32-char-secret>
# When Telegram is ready:
# supabase secrets set TELEGRAM_BOT_TOKEN=...
# supabase secrets set TELEGRAM_CHAT_ID=...
```

### 5.5 Fix offboarding RLS migration

Create `supabase/migrations/20260224000001_fix_offboarding_rls_after_role_consolidation.sql`:
- Drop + recreate offboarding RLS policies using `['admin', 'super_admin']`
- Match the pattern from `20260217000010_fix_onboarding_rls_after_role_consolidation.sql`

---

## Verification Checklist

### Local Testing

```bash
# 1. Serve Edge Functions locally
supabase functions serve onboarding-new-employee --env-file .env.local

# 2. Test onboarding (replace IDs)
curl -X POST http://localhost:54321/functions/v1/onboarding-new-employee \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "uuid-here", "employeeEmail": "test@example.com", "employeeName": "Test User"}'

# 3. Test offboarding
curl -X POST http://localhost:54321/functions/v1/offboarding-exit-process \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "uuid", "lastWorkingDay": "2026-03-15", "initiatedBy": "uuid", "firstName": "Test", "lastName": "User", "email": "test@example.com"}'

# 4. Test probation check
curl -X POST http://localhost:54321/functions/v1/probation-check \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

# 5. Typecheck web app
pnpm typecheck

# 6. Lint
pnpm lint
```

### Integration Testing

- [ ] Deploy Edge Functions to Supabase staging: `supabase functions deploy onboarding-new-employee`
- [ ] Trigger onboarding → verify `onboarding_checklists` + `onboarding_tasks` records created
- [ ] Trigger offboarding → verify `offboarding` + `offboarding_tasks` records created
- [ ] Verify Resend emails received (check Resend dashboard)
- [ ] Verify in-app notification records created in `notifications` table (check via Supabase Table Editor)
- [ ] Verify `audit_logs` entries with correct `action` + `metadata`
- [ ] **Idempotency:** Call each function twice with same input → no duplicates
- [ ] **Auth:** Call without auth header → 401 response

### Cron Testing

- [ ] Deploy to Vercel preview → check "Cron Jobs" tab in Vercel dashboard
- [ ] Manually trigger `/api/cron/probation-check` → verify Edge Function executes
- [ ] Verify `CRON_SECRET` auth rejects unauthenticated requests

---

## Future Phases (Remaining 10 Workflows)

After critical path is validated, migrate in batches using the same patterns:

### Batch 2: Content Lifecycle (4 workflows → 2 Edge Functions)

| n8n Workflow | Edge Function | Vercel Cron |
|---|---|---|
| `announcements-auto-publish` + `announcements-auto-expire` | `announcements-lifecycle` | `*/15 * * * *` |
| `resources-auto-publish` + `resources-auto-expire` | `resources-lifecycle` | `*/15 * * * *` |

> Merge publish + expire into single lifecycle function per content type.

### Batch 3: Scheduled Notifications (4 workflows → 4 Edge Functions)

| n8n Workflow | Edge Function | Vercel Cron |
|---|---|---|
| `notifications-birthday-reminder` | `birthday-reminder` | `0 0 * * *` |
| `notifications-anniversary-reminder` | `anniversary-reminder` | `0 0 * * *` |
| `notifications-payroll-reminder` | `payroll-reminder` | `0 0 * * *` |
| `resources-new-notification` | `resource-published-notify` | Webhook (no cron) |

### Batch 4: Intern Management (2 workflows → 2 Edge Functions)

| n8n Workflow | Edge Function | Vercel Cron |
|---|---|---|
| `intern-eod-reminder` | `intern-eod-reminder` | `0 8 * * *` (4 PM PHT) |
| `intern-weekly-summary` | `intern-weekly-summary` | `0 9 * * 5` (5 PM PHT Friday) |

---

## Output Format Per Function

When implementing each Edge Function, deliver:

1. **Brief explanation** of the architectural shift for that specific feature
2. **Complete, copy-pasteable TypeScript code** (`index.ts` + `deno.json`)
3. **SQL migration snippet** (if any schema changes needed)
4. **Vercel cron route** (for scheduled functions) or **API route** (for webhook functions)
5. **Deployment & test instructions** using Supabase CLI + curl examples
