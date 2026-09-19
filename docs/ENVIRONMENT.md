# Environment Variables

Environment variables used by the SN Connect monorepo — the Control Hub portal (`apps/web`), the public site (`apps/www`), Supabase Edge Functions, and the ops scripts under `scripts/`.

**Source of truth for the required set:** [`packages/config/src/env.ts`](../packages/config/src/env.ts). Anything listed there is validated with Zod at startup and the app refuses to boot without it. Everything else is read directly via `process.env` / `Deno.env` and degrades gracefully when absent.

## Quick Setup

1. Create `.env.local` in the repo root. There is **no `.env.example`** checked in — use the "Required" table below as the minimum set.
2. Fill in the required values.
3. Switch between environment targets with the helper scripts:
   ```bash
   pnpm env:use-local      # .env.local.localdev
   pnpm env:use-staging    # .env.local.stagingdev
   pnpm env:use-prodops    # .env.local.prodops
   ```

**For local development:** set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` to bypass Supabase Auth entirely. Test accounts: `employee@test.com`, `associate@test.com`, `admin@test.com`, `superadmin@test.com` (all with password `password`).

**For production:** set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false` and provide real Supabase credentials.

---

## Required (validated at startup)

These are the variables in the Zod schema. A missing or malformed value throws `Invalid environment variables` before the app serves a request.

| Variable | Description | Validation |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`). Exposed to the browser. | Valid URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous/public API key. Permissions are bounded by RLS. Exposed to the browser. | Non-empty |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **Bypasses RLS — server-side only, never expose to the client.** | Non-empty |
| `OPENAI_API_KEY` | OpenAI API key. Powers all AI features: RAG chat, embeddings, resume parsing/evaluation, receipt OCR, project intake extraction. | Starts with `sk-` |
| `RESEND_API_KEY` | Resend transactional email key. Sender policy: one verified From address (`no-reply@sngroup.com.au`), vary only the display name per context. | Starts with `re_` |
| `CRON_SECRET` | Authenticates Vercel Cron requests to `/api/cron/*`. Set in Vercel project settings. | Min 16 chars |
| `JWT_SECRET` | **Legacy.** Still validated by the schema, but no application code reads it — auth is Supabase Auth via `@supabase/ssr` cookies. Set any 32+ char random string until it is removed from the schema. | Min 32 chars |

Optional entries that are also declared in the schema: `ADMIN_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHAT_ID`.

---

## AI

The application's AI runs on **OpenAI**. `packages/ai` wraps the `openai` SDK — chat defaults to `gpt-5.4-mini`, embeddings to `text-embedding-3-small`.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | See Required above. Also read by the `generate-embeddings` Edge Function. | Yes | — |
| `OPENAI_MODEL` | Model override used by `scripts/backfill/backfill-invoice-php-amounts.mjs`. | No | script default |
| `EMBEDDING_API_URL` | Alternative embeddings endpoint for the `generate-embeddings` Edge Function. | No | OpenAI |
| `EMBEDDING_API_KEY` | Key for that endpoint. Falls back to `OPENAI_API_KEY`. | No | `OPENAI_API_KEY` |
| `EMBEDDING_MODEL` | Embedding model override. | No | `text-embedding-3-small` |
| `LANGWATCH_API_KEY` | Enables LangWatch OTel tracing via `apps/web/src/instrumentation.ts`. Tracing is skipped entirely when unset. | No | — |
| `ANTHROPIC_API_KEY` | **Optional, single use.** Read only by the `transcribe-recording` Edge Function to summarize stand-up transcripts. When absent the function logs a warning and returns `[Summary unavailable]` — transcription itself still works. No other part of the codebase uses Anthropic. | No | — |

---

## Auth & Application URLs

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_ENABLE_MOCK_AUTH` | Bypass Supabase Auth for local dev. Middleware skips server-side session checks and `AuthContext` uses the mock path. | No | `false` |
| `NEXT_PUBLIC_SITE_URL` | Canonical portal base URL. Takes priority over preview URLs for auth redirects, password reset, invite, and onboarding approval emails. **Required in production.** | No | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Canonical portal URL used by the public site for login and access CTAs. | No | `http://localhost:3001` |
| `NEXT_PUBLIC_WWW_URL` | Canonical public site URL for cross-app links. | No | `http://localhost:3000` |
| `APP_URL` | Portal base URL for Edge Functions and server-side jobs generating absolute links outside the Next.js runtime. Set to `https://app.sngroup.com.au` in production. | No | — |
| `WEBHOOK_BASE_URL` | Public base URL for registering Google Drive watch callbacks. Falls back to `NEXT_PUBLIC_SITE_URL`, then `APP_URL`. | For Drive watch | — |
| `ADMIN_SECRET_KEY` | Manual Edge Function invocation via the `X-Admin-Key` header. Generate with `openssl rand -base64 32`. | No | — |

---

## Google Workspace (Drive & Calendar)

Shared service-account credentials drive both the knowledge-base Drive sync and the company calendar.

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email. | For Drive/Calendar |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (PEM; escape newlines as `\n`). | For Drive/Calendar |
| `GOOGLE_CALENDAR_ID` | Calendar the company-pulse and calendar views read from. | For Calendar |
| `GOOGLE_DRIVE_WATCH_FILE_IDS` | Comma-separated Drive file IDs synced into the knowledge base by `/api/cron/drive-doc-sync`. | For Drive sync |
| `GOOGLE_DRIVE_WEBHOOK_TOKEN` | Shared token echoed by Drive push notifications; verified by `/api/webhooks/drive`. | For Drive sync |
| `GOOGLE_DRIVE_WATCH_RENEW_SECRET` | Authenticates `/api/internal/renew-drive-watches`. Falls back to `CRON_SECRET`. | No |

---

## Wise (TransferWise) Payouts

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WISE_API_KEY` | Wise Business API token (**Read & Write**), from Settings → API tokens. | For payroll | — |
| `WISE_PROFILE_ID` | Wise Business profile ID (numeric). Find via `GET /v1/profiles`. | For payroll | — |
| `WISE_ENVIRONMENT` | `sandbox` or `production`. Controls the API base URL. | No | `sandbox` |
| `WISE_WEBHOOK_PUBLIC_KEY` | RSA public key (PEM, including header/footer) verifying Wise webhook signatures. Fetch from `GET /v1/webhook/public-keys`. | For webhooks | — |
| `WISE_SANDBOX_FALLBACK_RECIPIENT_ID` | Recipient ID substituted in sandbox when an employee has no Wise recipient. | No | — |

---

## Background Jobs & Webhooks

| Variable | Description | Required |
|----------|-------------|----------|
| `INNGEST_EVENT_KEY` | Inngest event key used by `apps/www` to emit `ats/resume.upload` on application submit. | For ATS pipeline |
| `INNGEST_BASE_URL` | Inngest ingest endpoint override. Defaults to `https://inn.gs`. | No |
| `INTAKE_WEBHOOK_SECRET` | Shared secret verifying inbound requests to `/api/projects/intake`. | For project intake |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Mux API credentials for video resource upload and playback. | For video resources |
| `MUX_WEBHOOK_TOKEN` | Verifies Mux webhook calls to `/api/resources/mux/webhook`. | For video resources |
| `OPEN_EXCHANGE_RATES_API_KEY` | Read by the `update-fx-rates` Edge Function. The function returns an error without it. | For FX rates |
| `EXPENSE_OCR_INLINE_FALLBACK` | Set `true` to run expense OCR inline instead of via Inngest. Already implied outside production. | No |
| `ALLOWED_ORIGINS` | CORS allow-list for Edge Functions. | No |

---

## Telegram

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token for the app-level notification sender and webhook handler. Create via BotFather. | For Telegram |
| `TELEGRAM_BOT_USERNAME` | Bot username used to build the one-time `https://t.me/<bot>?start=<token>` account-link URL in Settings. | For Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Expected in the `X-Telegram-Bot-Api-Secret-Token` header when Telegram calls the app webhook. Recommended in production. | No |
| `TELEGRAM_CHAT_ID` | Destination chat/group ID for n8n digest delivery. | For n8n digests |

---

## n8n Workflows

The 13 workflows in `n8n/workflows/` run in an external n8n runtime and read their own credentials there. **None of them use Anthropic** — they call Supabase RPCs and deliver via Telegram or email.

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Base Supabase project URL for n8n REST calls. Matches `NEXT_PUBLIC_SUPABASE_URL` with no path suffix. |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by n8n to call `get_intern_eod_digest_source` and upsert into `intern_eod_digest_runs`. Same secret as the Supabase section — server-side tooling only. |
| `TELEGRAM_BOT_TOKEN` | Delivers the department digest message. |
| `TELEGRAM_CHAT_ID` | Target chat or group ID for the digest. |

`n8n/workflows/intern-eod-telegram-department-digest.json` expects all four above to be configured before import or activation.

The portal also calls out to n8n webhooks:

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_MARKETING_REPORT_WEBHOOK_URL` | Notifies n8n on marketing report submission. Skipped with a warning when unset. | No |
| `N8N_FIVE_PERCENT_REFLECTION_WEBHOOK_URL` | Notifies n8n on five-percent reflection submission. Skipped with a warning when unset. | No |

---

## Public Site (`apps/www`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `INQUIRY_ABUSE_SECRET` | Server-only secret used to HMAC inquiry IP, email, and dedupe identifiers into `inquiry_rate_limit_buckets` / `inquiry_deduplication_keys`. Use 32+ random bytes, distinct and stable per environment. Never prefix with `NEXT_PUBLIC_`. | Yes | — |
| `INQUIRY_NOTIFICATION_EMAIL` | Destination address for new public inquiry notifications. | No | — |
| `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS` | Hides in-progress expansion sections on the marketing site. | No | `false` |
| `NEXT_PUBLIC_STEVEN_BOOKING_URL` / `NEXT_PUBLIC_STEVEN_BOOKING_EMBED_URL` | Google Appointments links behind `/booking/steven`. | No | — |
| `NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL` / `NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL` | Generic booking link fallbacks. | No | — |

---

## Development & Testing

| Variable | Description |
|----------|-------------|
| `E2E_BASE_URL` | Target base URL for Playwright runs. |
| `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` | Credentials for authenticated Playwright specs. |
| `PLAYWRIGHT_WEB_PORT` | Port used by `scripts/playwright/start-playwright-web.js`. |
| `APP_UPDATE_SUMMARY` / `APP_UPDATE_SUMMARY_TITLE` | Override the generated changelog banner (`scripts/reports/generate-application-update-summary.mjs`, runs on `predev`/`prebuild`). |
| `ALLOW_LOCAL_SUMMARY_BYPASS` | Skip the update-summary check locally. |
| `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | Direct Postgres connection used by some `scripts/` utilities. |

---

## Usage

```typescript
import { env } from "@hr-portal/config";

// Validated and type-safe
console.log(env.NEXT_PUBLIC_SUPABASE_URL);
```

Variables outside the schema are read directly:

```typescript
const key = process.env.LANGWATCH_API_KEY;
if (!key) return; // every optional integration must degrade gracefully
```

## Validation

`packages/config/src/env.ts` parses `process.env` at import time. On failure it logs each offending variable and throws `Invalid environment variables`.

Rules currently enforced:
- `NEXT_PUBLIC_SUPABASE_URL` must be a valid URL
- `OPENAI_API_KEY` must start with `sk-`
- `RESEND_API_KEY` must start with `re_`
- `JWT_SECRET` must be at least 32 characters
- `CRON_SECRET` must be at least 16 characters
- `ADMIN_SECRET_KEY`, when set, must be at least 32 characters

## Local Development with Mock Auth

1. Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` in `.env.local`
2. Supabase keys can be omitted — they are not used on this path
3. Sign in with:
   - `employee@test.com` / `password` — Employee
   - `associate@test.com` / `password` — Associate
   - `admin@test.com` / `password` — Admin (also covers legacy `hr`/`cos`/`ceo`)
   - `superadmin@test.com` / `password` — Super Admin

## Local Development with Supabase

1. Start the local stack: `pnpm supabase:start` (check with `pnpm supabase:status`)
2. Apply migrations: `pnpm db:migrate`
3. Regenerate types after schema changes: `pnpm db:generate`
4. Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false` and fill in the local Supabase URL and keys
5. Create test users in the Supabase Auth dashboard

See `supabase/SETUP.md` for details.

---

## Notes on Removed Variables

- `NEXT_PUBLIC_ROLE_MAPPING_MODE` — removed. Role mapping is now fixed in `AuthContext.resolveUiRole` and `lib/auth/role.ts`; the `option-a`/`b`/`c` switch described in ADR-001 no longer exists in code.
