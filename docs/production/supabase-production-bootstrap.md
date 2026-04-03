# Supabase Production Bootstrap

This runbook defines the recommended way to launch SN Connect on a clean Supabase production project.

Recommended approach:
- create a brand-new Supabase project for live production
- apply schema through migrations
- import only approved baseline data
- manually bootstrap one `super_admin`
- invite the remaining real leadership users from inside the app

Do not use the current mixed test project as the long-term production source of truth.

## Branching vs New Project

Use a new project for go-live.

Use Supabase branching after that for:
- preview environments
- staging or QA
- migration rehearsal
- safe testing of schema and config changes

Reason:
- Supabase branches are ideal for isolated testing, but they still belong to one main project lifecycle
- a brand-new production project gives you the cleanest auth state, storage state, and audit baseline

## Target Environment Model

Recommended model for this repo:
- local development: Supabase CLI + migrations
- staging or preview: Supabase branch or separate staging project
- production: separate clean Supabase project

## Bootstrap Order

1. Create a new Supabase project in the target production region.
2. Link the repo to the new project.
3. Push all migrations.
4. Configure project-level settings and secrets.
5. Verify schema, RLS, functions, and storage buckets.
6. Run `pnpm check:production-cleanliness --expect-zero-users`.
7. Import only approved baseline data.
8. Create one bootstrap `super_admin`.
9. Sign in with that `super_admin`.
10. Invite the remaining real `admin` and `super_admin` users through `Invite Leadership`.
11. Run `pnpm check:leadership-accounts`.
12. Optionally rerun `pnpm check:production-cleanliness your-super-admin@company.com`.
13. Invite real employees and interns.

## What Migrations Already Provide

The repo migrations are expected to create or configure:
- database schema
- enums
- RLS policies
- helper functions
- views
- most app storage buckets and storage policies

Storage is mostly migration-managed for the core HR app.

Important exception:
- `ai-knowledge` is created lazily by runtime code in [apps/web/src/app/api/ai/sources/upload/route.ts](../../apps/web/src/app/api/ai/sources/upload/route.ts)
- after deployment, verify that the first knowledge upload succeeds or create the bucket explicitly before use

## Manual Project Configuration

These items still require explicit project configuration even on a fresh project:

### Auth

- configure the final site URL and redirect URLs
- confirm email auth settings match your launch requirements
- configure SMTP or provider-backed email delivery for production
- verify password reset flow and invite flow

Primary reference:
- [docs/ENVIRONMENT.md](../ENVIRONMENT.md)

### Secrets and Environment Variables

Set the production values for:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WWW_URL`
- `APP_URL`
- `RESEND_API_KEY`
- `CRON_SECRET`
- Wise variables if payroll is in scope
- AI provider variables that match the actual runtime code

### Edge Functions and Runtime Integrations

Reconfigure and verify:
- Edge Function secrets
- cron secrets
- Google Drive ingestion credentials if used
- Wise webhook secrets if used
- any provider-specific API keys not stored in SQL migrations

## Approved Baseline Import

Import only data that should truly exist on day one.

### Import by Default

- `departments`
- approved `resource_categories`
- approved `resources`
- approved `resource_collections` and `collection_resources`
- approved `knowledge_sources` only if they are real production knowledge assets
- `bank_registry`

### Import Conditionally

- `fx_rates` only if you want initial values immediately; otherwise the sync job can repopulate them
- `business_units` and `job_postings` only if you want the public site backed by live database content now

Note:
- the public site still contains placeholder-driven content in several areas under [apps/www/src/data/placeholder.ts](../../apps/www/src/data/placeholder.ts)
- DB-backed website content is therefore optional for initial HR portal launch unless you are actively switching the website to live content management

### Do Not Import

- test or sample `auth.users`
- `public.users` from the old mixed environment
- fake `employees`
- `onboarding_profiles` and onboarding progress from testing
- `tasks`
- `reports`
- `notifications`
- `announcements` unless they are real launch announcements you explicitly approved
- `invoices`
- `performance_reviews`, `okrs`, `kpis`, and test KPI evidence
- `internships` and `internship_daily_logs`
- `audit_logs`
- `applications` and resume uploads from testing
- uploaded test files from any bucket

## Seed Policy

For this repo, automatic branch seed data should stay safe and minimal.

Use the default `supabase/seed.sql` only for:
- no-op baseline seeding
- carefully reviewed non-demo defaults

Do not put fake HR records, test users, or demo business data into `supabase/seed.sql`.

Development-only sample data remains separate under:
- [supabase/seed/01_sample_data.sql](../../supabase/seed/01_sample_data.sql)
- [supabase/seed/02_corporate_website.sql](../../supabase/seed/02_corporate_website.sql)

Those files must be applied manually and intentionally in non-production environments only.

## Bootstrap Super Admin

Because the leadership invite flow requires an authenticated `super_admin`, create exactly one bootstrap `super_admin` first.

Minimum bootstrap requirements:
- create the auth user with a real company email
- set `app_metadata.db_role=super_admin`
- create the matching `public.users` row with `role='super_admin'` and `status='active'`
- create the matching `public.employees` row

After first login:
- open the directory
- use `Invite Leadership`
- create the remaining real `admin` and `super_admin` users

Then verify with:
- `pnpm check:leadership-accounts`

## Post-Bootstrap Checks

Before launch, verify:
- leadership login succeeds
- leadership accounts are not redirected into onboarding
- resources load correctly
- uploads work for the buckets you actually use
- AI upload works if knowledge ingestion is part of launch scope
- password reset works
- invite email works

Useful commands:
- `pnpm check:production-cleanliness --expect-zero-users` before bootstrap
- `pnpm check:production-cleanliness your-super-admin@company.com` after bootstrap if you want auth users restricted to a known allowlist at that checkpoint
- `pnpm check:leadership-accounts` after leadership invites

## Recommended Branching Use After Launch

Once the clean production project exists, use Supabase branching for:
- previewing migrations before merge
- testing seed-safe environments
- QA and rehearsal without touching production

That gives you the operational benefits of branching without carrying the old test project into live production.