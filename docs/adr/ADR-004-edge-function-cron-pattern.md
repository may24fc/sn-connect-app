# ADR-004: Edge Function + Vercel Cron Pattern

**Date:** 2026-02-27  
**Status:** Accepted  
**Context:** Migration from n8n workflows to Supabase Edge Functions  

## Decision

All automated workflows (scheduled and webhook-triggered) will follow a standardized three-tier pattern:

1. **Supabase Edge Function** — Contains all business logic
2. **Next.js API Route** — Thin shim for auth + invocation
3. **Vercel Cron Config** — Schedule definition (for cron-triggered functions only)

## Architecture

```
Scheduled workflows:
  Vercel Cron (vercel.json)
    → GET /api/cron/<name>/route.ts (CRON_SECRET auth)
      → supabase.functions.invoke('<name>')
        → Edge Function (service role, Deno runtime)

Webhook-triggered workflows:
  Admin UI / System Event
    → POST /api/<domain>/action/route.ts (JWT + role check)
      → supabase.functions.invoke('<name>')
        → Edge Function (service role, Deno runtime)
```

## Rationale

- **Vercel Cron Jobs** avoid requiring Supabase Pro plan for `pg_cron`
- **Edge Functions** provide isolated Deno runtime with service-role access
- **API Route shims** enforce auth boundaries (JWT for users, CRON_SECRET for cron)
- **Shared utilities** in `_shared/` reduce duplication across functions

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

### Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/<name>",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Common schedules (all UTC, PHT = UTC+8):
| Schedule | UTC | PHT | Use Case |
|---|---|---|---|
| `0 0 * * *` | Midnight | 8:00 AM | Daily morning tasks |
| `0 8 * * *` | 8:00 AM | 4:00 PM | End-of-day tasks |
| `0 9 * * 5` | 9:00 AM Fri | 5:00 PM Fri | Weekly summaries |
| `*/15 * * * *` | Every 15 min | Every 15 min | Content lifecycle |

## Secrets Management

### Edge Function Secrets (Supabase)

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set ADMIN_SECRET_KEY=<32+ char secret>
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected
```

### Vercel Environment Variables

| Variable | Description |
|---|---|
| `CRON_SECRET` | Auto-injected by Vercel for cron auth (min 16 chars) |
| `ADMIN_SECRET_KEY` | Shared with Edge Functions for X-Admin-Key auth |

## Deployed Functions

| Edge Function | Type | API Route | Schedule |
|---|---|---|---|
| `onboarding-new-employee` | Webhook | `/api/onboarding/initiate` | — |
| `offboarding-exit-process` | Webhook | `/api/offboarding/initiate` | — |
| `probation-check` | Cron | `/api/cron/probation-check` | `0 0 * * *` (daily) |

## Future Functions (Remaining Batches)

| Edge Function | Type | Schedule | Batch |
|---|---|---|---|
| `announcements-lifecycle` | Cron | `*/15 * * * *` | 2 |
| `resources-lifecycle` | Cron | `*/15 * * * *` | 2 |
| `birthday-reminder` | Cron | `0 0 * * *` | 3 |
| `anniversary-reminder` | Cron | `0 0 * * *` | 3 |
| `payroll-reminder` | Cron | `0 0 * * *` | 3 |
| `resource-published-notify` | Webhook | — | 3 |
| `intern-eod-reminder` | Cron | `0 8 * * *` | 4 |
| `intern-weekly-summary` | Cron | `0 9 * * 5` | 4 |

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
