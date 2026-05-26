# ADR-004: Edge Function + n8n Cron Pattern

**Date:** 2026-02-27  
**Updated:** 2026-07-16  
**Status:** Accepted (amended — Vercel Cron replaced by n8n)  
**Context:** Migration from n8n workflows to Supabase Edge Functions; scheduling migrated from Vercel Cron to n8n  

## Decision

All automated workflows (scheduled and webhook-triggered) will follow a standardized pattern:

1. **Supabase Edge Function** — Contains all business logic (Deno runtime)
2. **n8n Workflow** — Schedule Trigger → HTTP POST → Edge Function (for cron-triggered functions)
3. **Next.js API Route** — Thin shim for user-initiated invocations (webhook-triggered functions only)

## Architecture

```
Scheduled workflows (cron):
  n8n Schedule Trigger (cron expression)
    → HTTP POST {{ $env.SUPABASE_URL }}/functions/v1/<name>
      → Edge Function (service role auth via Bearer token, Deno runtime)
    → IF failure → Gmail alert to HR_ADMIN_EMAIL

Webhook-triggered workflows:
  Admin UI / System Event
    → POST /api/<domain>/action/route.ts (JWT + role check)
      → supabase.functions.invoke('<name>')
        → Edge Function (service role, Deno runtime)
```

## Rationale

- **n8n** provides visual workflow management, built-in retry/error handling, execution history, and Gmail alerting without Vercel Pro plan
- **Edge Functions** provide isolated Deno runtime with service-role access
- **n8n environment variables** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HR_ADMIN_EMAIL`) centralize config
- **Gmail failure alerts** replace Slack for operational notifications
- **Shared utilities** in `_shared/` reduce duplication across functions

## Amendment: Vercel Cron → n8n Migration (2026-07-16)

The original ADR used Vercel Cron as the scheduler, requiring a Next.js API route shim per cron job. This has been replaced with n8n workflows that call Edge Functions directly via HTTP POST:

- **Removed**: Vercel `crons` config from `vercel.json`
- **Removed**: Dependency on `CRON_SECRET` for scheduled functions
- **Added**: 8 n8n workflows on `flow.sngroup.cloud` with Schedule Trigger → HTTP POST pattern
- **Added**: Gmail failure alerting on every workflow
- **Kept**: API route shims for webhook-triggered functions (user-initiated)

## Templates

### Edge Function (`supabase/functions/<name>/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'zod';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { writeAuditLog } from '../_shared/audit.ts';

// Optional: import { sendEmail } from '../_shared/resend.ts';
// Optional: import { createInAppNotification } from '../_shared/in-app-notify.ts';

const inputSchema = z.object({
  // Define input schema here (empty for cron functions)
});

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Validate auth
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    // 2. Parse input (for webhook-triggered functions)
    // const body = await req.json();
    // const input = inputSchema.parse(body);

    // 3. Idempotency check
    // ...

    // 4. Business logic
    // ...

    // 5. Audit log
    await writeAuditLog(supabase, {
      tableName: 'table_name',
      recordId: 'record-uuid',
      action: 'action_name',
      metadata: { /* structured data */ },
    });

    // 6. Return result
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[<name>] Error:`, message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Edge Function Config (`supabase/functions/<name>/deno.json`)

```json
{
  "imports": {}
}
```

Inherits from the shared `supabase/functions/deno.json`.

### Cron Shim Route (`apps/web/src/app/api/cron/<name>/route.ts`)

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Invoke Edge Function
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.functions.invoke('<name>', {
      headers: {
        'X-Admin-Key': process.env.ADMIN_SECRET_KEY ?? '',
      },
    });

    // 3. Return result
    if (error) {
      console.error('[cron/<name>] Edge Function error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[cron/<name>] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Webhook API Route (`apps/web/src/app/api/<domain>/<action>/route.ts`)

```typescript
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  // Define request body schema
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Validate JWT
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin role
    const { data: userRecord } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (!userRecord || !['admin', 'super_admin'].includes(userRecord.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 4. Invoke Edge Function
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.functions.invoke('<function-name>', {
      body: parsed.data,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(data, { status: data?.success ? 201 : 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### n8n Cron Workflow Pattern

Each cron workflow on `flow.sngroup.cloud` follows this pattern:

```
Schedule Trigger (cron expression, UTC timezone)
  → HTTP POST to {{ $env.SUPABASE_URL }}/functions/v1/<name>
    - Header: Authorization = Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
    - Header: Content-Type = application/json
    - Body: { "source": "n8n-cron" }
    - continueOnFail: true
  → IF $json.success == true → Done (NoOp)
  → ELSE → Gmail: Alert on Failure → HR_ADMIN_EMAIL
```

### n8n Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin access |
| `HR_ADMIN_EMAIL` | Email for failure alerts |
| `APP_URL` | Application URL for deep links |

### Vercel Environment Variables (Webhook Routes Only)

| Variable | Description |
|---|---|
| `ADMIN_SECRET_KEY` | Shared with Edge Functions for X-Admin-Key auth |

## Deployed Functions

| Edge Function | Type | n8n Workflow / API Route | Schedule (UTC) | PHT | CET | AEST |
|---|---|---|---|---|---|---|
| `onboarding-new-employee` | Webhook | `/api/onboarding/initiate` | — | — | — | — |
| `offboarding-exit-process` | Webhook | `/api/offboarding/initiate` | — | — | — | — |
| `probation-check` | Cron | `[Control Hub] Cron: Probation Check` | `0 0 * * *` | 8 AM | 1 AM | 10 AM |
| `update-fx-rates` | Cron | `[Control Hub] Cron: Update FX Rates` | `0 0 * * *` | 8 AM | 1 AM | 10 AM |
| `milestone-announcements` | Cron | `[Control Hub] Cron: Milestone Announcements` | `0 0 * * *` | 8 AM | 1 AM | 10 AM |
| `announcements-lifecycle` | Cron | `[Control Hub] Cron: Content Lifecycle` | `*/15 * * * *` | Every 15m | Every 15m | Every 15m |
| `resources-lifecycle` | Cron | `[Control Hub] Cron: Content Lifecycle` | `*/15 * * * *` | Every 15m | Every 15m | Every 15m |
| `cleanup-soft-deleted` | Cron | `[Control Hub] Cron: Data Maintenance` | `0 2 * * 0` | 10 AM Sun | 3 AM Sun | 12 PM Sun |
| `cleanup-old-notifications` | Cron | `[Control Hub] Cron: Data Maintenance` | `0 2 * * 0` | 10 AM Sun | 3 AM Sun | 12 PM Sun |
| `intern-eod-reminder` | Cron | `[Control Hub] Cron: Intern EOD Reminder` | `0 8 * * 1-5` | 4 PM | 9 AM | 6 PM |
| `intern-weekly-summary` | Cron | `[Control Hub] Cron: Intern Weekly Summary` | `0 9 * * 5` | 5 PM Fri | 10 AM Fri | 7 PM Fri |
| `payroll-reminder` | Cron | `[Control Hub] Cron: Payroll Reminder` | `0 0 25-31 * *` | 8 AM | 1 AM | 10 AM |
| `check-late-reports` | Cron | `compliance-late-report-escalation` (n8n) | `30 0 * * *` | 8:30 AM | 1:30 AM | 10:30 AM |

## Shared Utilities

All Edge Functions share utilities from `supabase/functions/_shared/`:

| File | Purpose |
|---|---|
| `supabase-admin.ts` | Service-role Supabase client factory |
| `cors.ts` | CORS headers + preflight handler |
| `auth.ts` | Admin auth validation (Bearer + X-Admin-Key) |
| `resend.ts` | Transactional email via Resend API with retry |
| `in-app-notify.ts` | Insert into `notifications` table |
| `audit.ts` | Write to `audit_logs` table |
| `env.ts` | Zod-validated environment variables |
