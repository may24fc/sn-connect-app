# Environment Variables

This document describes all environment variables required by the HR Portal application.

## Setup

1. Copy `.env.example` to `.env` in the project root
2. Fill in all required values
3. The application validates environment variables at startup using Zod

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

### n8n

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_WEBHOOK_URL` | The base URL for n8n webhooks. Used to trigger automated workflows. | Yes |
| `N8N_API_KEY` | API key for authenticating with n8n. Used for secure communication with n8n workflows. | Yes |

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
