# Supabase Edge Functions Deployment

## Overview

Edge Functions are deployed automatically via GitHub Actions on every push that touches `supabase/functions/**`. Manual deployment is also supported via workflow dispatch.

**Workflow file:** `.github/workflows/supabase-functions-deploy.yml`

---

## Environments

| Environment | Supabase Project | Triggered By |
|-------------|-----------------|--------------|
| Staging | `zihdtxpvugdphieujhzk` | Push to `dev` branch |
| Production | `tccdupkjmwwxcvpqnpeb` | Push to `master` branch |
| Manual | Either | `workflow_dispatch` with env selection |

---

## Deployed Functions (16)

| Function | Description |
|----------|-------------|
| `associate-eod-reminder` | Weekday 4 PM PHT — reminds interns who haven't submitted daily log |
| `associate-weekly-summary` | Weekly summary of associate activity |
| `milestone-announcements` | Publishes milestone-based announcements |
| `probation-check` | Checks and updates employee probation status |
| `update-fx-rates` | Fetches and stores latest FX rates |
| `announcements-lifecycle` | Archives/expires announcements by status |
| `resources-lifecycle` | Archives/expires resources by status |
| `cleanup-soft-deleted` | Permanently removes old soft-deleted records |
| `cleanup-old-notifications` | Removes stale notifications |
| `check-late-reports` | Flags late report submissions |
| `evaluation-cadence-reminders` | Sends self-evaluation cadence reminders plus last-week OKR/KPI update reminders |
| `payroll-reminder` | Sends payroll cutoff reminders |
| `onboarding-new-employee` | Bootstraps new employee onboarding tasks |
| `generate-embeddings` | Generates pgvector embeddings for knowledge base |
| `transcribe-recording` | Transcribes standup recordings via OpenAI |
| `offboarding-exit-process` | Handles offboarding workflow |

---

## Authentication

All Edge Functions use **custom auth** (`validateAdminAuth` in `_shared/auth.ts`) instead of Supabase's built-in JWT gateway. This is because:

- Supabase's gateway intercepts the `Authorization` header before function code runs
- `verify_jwt = false` is set in each function's `config.toml` to bypass the gateway
- `--no-verify-jwt` flag is also passed in the deploy command as a safeguard

### Auth Methods (either works)

**Method 1 — X-Admin-Key header (recommended for n8n/server-to-server):**
```
X-Admin-Key: <ADMIN_SECRET_KEY>
```

**Method 2 — Bearer token:**
```
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

### Required Secrets

Set these in Supabase Dashboard → Functions → Secrets for each environment:

| Secret | Description |
|--------|-------------|
| `ADMIN_SECRET_KEY` | Random hex secret used by n8n and server-to-server callers |
| `SUPABASE_URL` | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase |

---

## GitHub Actions Secrets

Set these in GitHub → Repo Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from supabase.com/dashboard/account/tokens |
| `SUPABASE_STAGING_PROJECT_REF` | `zihdtxpvugdphieujhzk` |
| `SUPABASE_PROJECT_REF` | `tccdupkjmwwxcvpqnpeb` |

---

## n8n Integration

n8n workflows call Edge Functions via HTTP Request nodes using:

- **Authentication:** Generic Credential Type → Header Auth
- **Staging credential:** `[Dev] Control Hub Supabase Service Role`
  - Header Name: `X-Admin-Key`
  - Header Value: `<ADMIN_SECRET_KEY>`
- **Production credential:** `Control Hub Supabase Service Role`
  - Header Name: `X-Admin-Key`
  - Header Value: `<ADMIN_SECRET_KEY>`

---

## Manual Deployment

To manually trigger a deployment:

1. Go to [GitHub Actions](https://github.com/may24fc/sn-connect-app/actions/workflows/supabase-functions-deploy.yml)
2. Click **Run workflow**
3. Select branch (`dev` for staging, `master` for production)
4. Select environment
5. Click **Run workflow**

---

## Import Map

All functions share a root import map at `supabase/functions/deno.json`:

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.47.0",
    "zod": "https://esm.sh/zod@3.23.0"
  }
}
```

This is passed via `--import-map ./supabase/functions/deno.json` in the deploy command to resolve bare specifiers in Deno.
