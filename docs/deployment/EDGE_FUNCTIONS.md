# Supabase Edge Functions Deployment

## Overview

Edge Functions are deployed manually with the repo-pinned Supabase CLI. The GitHub Actions auto-deploy workflow (`supabase-functions-deploy.yml`) was removed on 2026-11-04 after failing on every run since July 2026.

```bash
pnpm exec supabase functions deploy <function-name> --project-ref tccdupkjmwwxcvpqnpeb --no-verify-jwt
```

Always pass `--no-verify-jwt`: n8n calls functions with an `X-Admin-Key` header, which the Supabase gateway rejects when JWT verification is on.

---

## Environments

| Environment | Supabase Project | Deployed by |
|-------------|-----------------|-------------|
| Production | `tccdupkjmwwxcvpqnpeb` | Manual CLI deploy (see Overview) |

---

## Deployed Functions (16)

| Function | Description |
|----------|-------------|
| `associate-eod-reminder` | Weekday 4 PM PHT — reminds interns who haven't submitted daily log |
| `associate-weekly-summary` | Weekly summary of associate activity |
| `milestone-announcements` | Publishes milestone-based announcements |
| `probation-check` | Checks and updates employee probation status |
| `update-fx-rates` | Stores daily AUD-based rates (Frankfurter, falling back to ExchangeRate-API; no key) and refreshes expense AUD estimates. POST `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }` backfills up to 400 days from Frankfurter |
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

1. Confirm the target: production is `tccdupkjmwwxcvpqnpeb`. Staging is not in use.
2. Deploy one function: `pnpm exec supabase functions deploy <function-name> --project-ref tccdupkjmwwxcvpqnpeb --no-verify-jwt`
3. Confirm with `pnpm exec supabase functions list --project-ref tccdupkjmwwxcvpqnpeb`, then call the function once with the production service-role key or `X-Admin-Key`.

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
