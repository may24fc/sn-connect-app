# Environment Variables

This document describes all environment variables required by the HR Portal application.

## Quick Setup

1. Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in all required values (see variable descriptions below)
3. The application validates environment variables at startup using Zod

**For local development:** Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` to use mock authentication without needing a real Supabase project. Test accounts: employee@test.com, intern@test.com, admin@test.com, superadmin@test.com (all with password: `password`)

**For production:** Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false` and provide real Supabase credentials.

## Variables

### Supabase

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | The URL of your Supabase project (e.g., `https://your-project.supabase.co`). This is publicly exposed to the browser. | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anonymous/public API key for your Supabase project. This key has limited permissions defined by Row Level Security policies. Publicly exposed to the browser. | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role key for your Supabase project. This key bypasses Row Level Security and should only be used server-side. **Never expose this key to the client.** | Yes |

### Anthropic (Claude AI)

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | API key for Anthropic's Claude AI. Must start with `sk-ant-`. Used for AI-powered features in the application. Obtain from [Anthropic Console](https://console.anthropic.com/). | Yes |

### JWT

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens. Must be at least 32 characters long. Generate a secure random string (e.g., `openssl rand -base64 32`). | Yes |

### Edge Functions & Cron

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | API key for Resend transactional email service. Must start with `re_`. Used by Edge Functions to send emails. Obtain from [Resend Dashboard](https://resend.com/api-keys). Sender policy: keep a single verified From address (`no-reply@sngroup.com.au`) and vary only display names per email context. | Yes |
| `CRON_SECRET` | Secret used by Vercel to authenticate cron job requests. Must be at least 16 characters. Set in Vercel project settings. | Yes |
| `ADMIN_SECRET_KEY` | Secret key for manual Edge Function invocation via `X-Admin-Key` header. Must be at least 32 characters. Generate with `openssl rand -base64 32`. | No |
| `APP_URL` | Canonical internal app base URL for Edge Functions and other server-side jobs that generate absolute links outside the Next.js runtime. Set to `https://app.sngroup.com.au` in production. | No |

### n8n Workflows

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Base Supabase project URL used by n8n REST calls. For the intern EOD Telegram digest workflow, this should match `NEXT_PUBLIC_SUPABASE_URL` without any path suffix. | For n8n workflows |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used by n8n to call `get_intern_eod_digest_source` and upsert into `intern_eod_digest_runs`. This is the same secret documented in the Supabase section and must only be stored in server-side tooling such as n8n. | For n8n workflows |
| `ANTHROPIC_API_KEY` | Anthropic API key used by the `intern-eod-telegram-department-digest` workflow to summarize prior-day logs by department before delivery. | For AI-backed n8n workflows |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token used by n8n to deliver the department digest message. Obtain this from BotFather. | For Telegram workflows |
| `TELEGRAM_CHAT_ID` | Target Telegram chat or group ID that should receive the department digest. Use the numeric chat ID for the destination boss or group channel. | For Telegram workflows |

The workflow file `n8n/workflows/intern-eod-telegram-department-digest.json` expects all five variables above to be configured in the n8n runtime before import or activation.

### Wise (TransferWise) Payment Gateway

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WISE_API_KEY` | API token for Wise Business. Obtain from the Wise Business dashboard → Settings → API tokens. Use a **Read & Write** token. | For payroll | — |
| `WISE_PROFILE_ID` | Your Wise Business profile ID (numeric). Find it via `GET /v1/profiles` or in the Wise dashboard URL. | For payroll | — |
| `WISE_ENVIRONMENT` | `sandbox` for testing, `production` for live payments. Controls the API base URL. | No | `sandbox` |
| `WISE_WEBHOOK_PUBLIC_KEY` | RSA public key (PEM format) used to verify Wise webhook signatures. Fetch from `GET /v1/webhook/public-keys`. Must include `-----BEGIN PUBLIC KEY-----` header/footer. | For webhooks | — |

### Application

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_ENABLE_MOCK_AUTH` | Enable mock authentication for local development. Set to `true` to bypass Supabase Auth and use test accounts. Set to `false` for production. | No | `false` |
| `NEXT_PUBLIC_SITE_URL` | The canonical base URL of the internal app (e.g., `https://app.sngroup.com.au`). Takes priority over preview URLs for auth redirects, password reset emails, invite emails, and onboarding approval emails. **Required in production.** | No | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Canonical internal app URL used by the public website for login and access CTAs. Set to `https://app.sngroup.com.au` in production. | No | `http://localhost:3001` |
| `NEXT_PUBLIC_WWW_URL` | Canonical public website URL for cross-app links that should stay on the marketing site. Set to `https://www.sngroup.com.au` in production. | No | `http://localhost:3000` |
| `NEXT_PUBLIC_ROLE_MAPPING_MODE` | Role mapping strategy for UI roles. Options: `option-a`, `option-b`, or `option-c`. See [ADR-001-role-mapping.md](adr/ADR-001-role-mapping.md) for details. | No | `option-a` |

## Local Development with Mock Auth

For local development without a Supabase project:

1. Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` in your `.env.local`
2. You can skip setting Supabase keys (they won't be used)
3. Use these test accounts:
   - `employee@test.com` / `password` (Employee role)
   - `intern@test.com` / `password` (Intern role)
   - `admin@test.com` / `password` (Admin role - maps to hr/cos/ceo)
   - `superadmin@test.com` / `password` (Super Admin role)

## Local Development with Supabase

For local development with a real Supabase project:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations: `pnpm db:migrate`
3. Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false`
4. Configure all Supabase environment variables with your project values
5. Create test users in Supabase Auth dashboard

**Note:** Local Supabase development using Docker is supported but requires additional configuration. See `supabase/SETUP.md` for details.

## Usage

Import the validated environment variables in your code:

```typescript
import { env } from "@hr-portal/config";

// All variables are type-safe and validated
console.log(env.NEXT_PUBLIC_SUPABASE_URL);
```

## Validation

Environment variables are validated at application startup using Zod. If any required variable is missing or invalid, the application will fail to start with a descriptive error message.

Validation rules:
- URLs must be valid URL format
- `ANTHROPIC_API_KEY` must start with `sk-ant-`
- `JWT_SECRET` must be at least 32 characters
