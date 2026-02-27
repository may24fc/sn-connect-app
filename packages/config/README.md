# @hr-portal/config

Shared configuration and environment variable validation for the SN Connect HR Portal.

## Installation

```typescript
import { env } from '@hr-portal/config';
```

## Environment Validation

Uses Zod to validate all required environment variables at startup. Throws with descriptive errors if any are missing or invalid.

### Required Variables

| Variable | Validation | Description |
|----------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Valid URL | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Non-empty | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Non-empty | Supabase service role key |
| `ANTHROPIC_API_KEY` | Starts with `sk-ant-` | Claude API key |
| `JWT_SECRET` | Min 32 chars | JWT signing secret |
| `RESEND_API_KEY` | Starts with `re_` | Resend email API key |
| `CRON_SECRET` | Min 16 chars | Vercel cron job secret |

### Optional Variables

| Variable | Validation | Description |
|----------|------------|-------------|
| `ADMIN_SECRET_KEY` | Min 32 chars | Edge Function admin auth |

## Usage

```typescript
import { env } from '@hr-portal/config';

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

The `env` object is created once at module load time. Invalid variables cause an immediate startup error with clear messages.
