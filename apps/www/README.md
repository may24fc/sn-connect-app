# apps/www Developer Handoff

**Label:** Industry Standard

This document is the turnover guide for the public SN International website in `apps/www`.
It is written for the next developer who will own the site from local setup through deployment.

## 1. What This App Is

`apps/www` is the public marketing and recruitment site for SN International Group.

Stack:
- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS
- Framer Motion / GSAP for motion
- Supabase for public reads, form writes, and file storage
- Resend for transactional email
- Vercel for deployment

Default local port:
- `3000`

Primary repo commands:
- `pnpm dev` from repo root starts `apps/www`
- `pnpm build:www` builds the public site
- `pnpm --filter @sn-group/www typecheck` typechecks the app only

## 2. Ownership Boundary

This app is separate from the internal HR portal in `apps/web`.

Important deployment split:
- Root `vercel.json` is for `apps/www`
- `apps/web/vercel.json` is for `apps/web`

Do not change root Vercel settings assuming they belong to the portal.

## 3. Turn Over These Things

The next developer should receive all of the following before taking ownership.

### Access and credentials
- Vercel project access for the public site
- Supabase project access for the environment she will work against
- Resend account or API key management access
- Google Calendar booking link ownership or admin access
- Domain and DNS access for `www.sngroup.com.au`
- GitHub repo access with permission to run deployments

### Environment values
Provide actual values for:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_PORTAL_URL`
- `NEXT_PUBLIC_WWW_URL`
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL`
- `NEXT_PUBLIC_GOOGLE_BOOKING_URL`
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL` if used
- `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS`
- `RESEND_API_KEY`
- `INQUIRY_ABUSE_SECRET`
- `INQUIRY_NOTIFICATION_EMAIL`
- `INNGEST_EVENT_KEY` if ATS resume processing is enabled
- `INNGEST_BASE_URL` if not using the default

### Content and assets
- Final approved copy deck for all public pages
- Final image library and usage rights confirmation
- Final logo files and favicon files
- Final SEO metadata, OG image, and brand keywords
- Final business unit details if Businesses pages will be restored
- Final careers content if Careers pages will be restored
- Final culture and gallery content if Life at SN will be restored

### Operational context
- Which environment is the source of truth for public content
- Which pages are intentionally hidden versus unfinished
- Which forms must send emails in production
- Who receives inquiry notifications
- Whether public job applications should trigger ATS evaluation

## 4. Current State Summary

The site is deployable, but parts of it are intentionally hidden behind a feature flag because they still depend on incomplete or mock data.

Feature flag:
- `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS`

Current default behavior:
- Hidden unless the variable is explicitly set to `false`

Currently hidden routes:
- `/businesses`
- `/businesses/[slug]`
- `/businesses/[slug]/projects/[projectSlug]`
- `/careers`
- `/careers/[id]`
- `/life-at-sn`
- `/life-at-sn/[slug]`

Reference:
- `../docs/apps/www/hidden-sections-2026-03-30.md`

This means the next developer needs to treat the public site as two scopes:
- Live public scope: home, about, team, contact, legal pages, shared layout, API endpoints
- Deferred scope: businesses, careers, life-at-sn, and their related content systems

## 5. App Structure

High-value folders:
- `src/app` route files and API routes
- `src/components` marketing UI by page/domain
- `src/lib` config, Supabase clients, query keys, email utilities
- `src/data/placeholder.ts` placeholder and fallback content
- `public` static assets used directly by the site
- `src/assets` app-scoped assets

Core routes:
- `/` home
- `/about`
- `/team`
- `/contact`
- `/privacy`
- `/terms`

API routes:
- `POST /api/inquiries`
- `GET /api/businesses`
- `GET /api/jobs`
- `GET /api/team`
- `GET /api/applications`
- `POST /api/applications`

## 6. How Data Flows

### Public reads
Public reads use the anon-key server client in `src/lib/supabase/server.ts`.
These reads are expected to respect RLS.

Tables/views currently read by the site:
- `business_units`
- `job_postings`
- `employee_directory`

### Public writes
Form submissions use the admin client in `src/lib/supabase/server.ts`.
This bypasses RLS and must stay server-side only.

Writes currently include:
- `public_inquiries` inserts from `/api/inquiries`
- `job_applications` inserts from `/api/applications`
- `audit_logs` inserts for public job application submissions
- Supabase Storage bucket `applications` for resume uploads

### Email side effects
Email is sent through `src/lib/email.ts` using Resend.

Current flows:
- Inquiry notification email to internal recipient
- Inquiry confirmation email to submitter
- Application confirmation email to applicant

### ATS side effect
If a resume is uploaded and `INNGEST_EVENT_KEY` is configured, `/api/applications` sends a non-blocking event for ATS processing.

## 7. Environment Setup

Copy the template:

```bash
cp apps/www/.env.example apps/www/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item apps/www/.env.example apps/www/.env.local
```

Minimum variables required for the app to boot cleanly:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_PORTAL_URL`
- `NEXT_PUBLIC_WWW_URL`

Required for full form behavior:
- `RESEND_API_KEY`
- `INQUIRY_ABUSE_SECRET`
- `INQUIRY_NOTIFICATION_EMAIL`

Required for booking CTA behavior:
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL` or `NEXT_PUBLIC_GOOGLE_BOOKING_URL`

Optional:
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL`
- `INNGEST_EVENT_KEY`
- `INNGEST_BASE_URL`

Important note:
- Prefer file-based env values over stale terminal session values when verifying targets. Repo scripts have previously had environment precedence issues.

## 8. Supabase Configuration

Yes, `apps/www` needs Supabase configuration.

It does not own a separate Supabase project config, though. It uses the shared repo-level Supabase setup under `supabase/`.

That means there are two different concerns:
- app runtime env vars in `apps/www/.env.local` or Vercel env vars
- shared local Supabase infrastructure config in `supabase/config.toml`

### What `apps/www` uses Supabase for

`apps/www` depends on Supabase for:
- public read APIs through the anon key
- server-side form writes through the service-role key
- resume uploads to Supabase Storage
- database-backed content for businesses, jobs, and team listings

### Runtime env vars required by `apps/www`

These are the Supabase env values the public site needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

How they are used:
- anon key: public read endpoints in `src/app/api/businesses/route.ts`, `src/app/api/jobs/route.ts`, and `src/app/api/team/route.ts`
- service-role key: write endpoints in `src/app/api/inquiries/route.ts` and `src/app/api/applications/route.ts`

### Shared local Supabase config

The local Supabase stack is configured at:
- `../../supabase/config.toml`

This repo uses non-default local ports on Windows because the default `54321` to `54324` range is reserved on this machine.

Current local port map:
- API: `55321`
- DB: `55322`
- Studio: `55323`
- Inbucket: `55324`

Important implication:
- if the next developer runs the local Supabase stack, `apps/www/.env.local` must point to the local API URL and keys for that local stack
- do not assume the default Supabase local URL/port values from generic tutorials

### Local Supabase commands

From repo root:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Use `pnpm supabase:status` to confirm the currently active local API URL and other local connection details before wiring `apps/www/.env.local`.

### Database objects `apps/www` depends on

Public reads:
- `business_units`
- `job_postings`
- `employee_directory`

Public writes:
- `public_inquiries`
- `job_applications`
- `audit_logs`

Storage:
- bucket `applications` for uploaded resumes

If any of these are missing in the target Supabase environment, the public site will boot partially but its API behavior will fail.

### RLS and permission model

Expected access model:
- public read endpoints use the anon key and should succeed through RLS-safe reads
- write endpoints use the service-role key and bypass RLS on the server only

This is why `SUPABASE_SERVICE_ROLE_KEY` is mandatory for the full site, not optional.

If the developer sees read requests failing with the anon key, the problem is usually one of these:
- wrong Supabase project URL or key
- missing table/view in the target environment
- RLS/policy mismatch in the target environment

If writes fail, the usual causes are:
- missing service-role key
- missing storage bucket `applications`
- missing tables such as `public_inquiries`, `job_applications`, or `audit_logs`

### Remote vs local Supabase workflow

There are two valid ways to run `apps/www` locally.

Important:
- `apps/www/.env.local` points to one Supabase target at a time
- it does not point to both simultaneously

Valid options:

1. Point `apps/www/.env.local` at a remote Supabase project.
2. Point `apps/www/.env.local` at the repo's shared local Supabase stack.

Practical rule:
- if `NEXT_PUBLIC_SUPABASE_URL` is the remote project URL, `www` is using remote Supabase
- if `NEXT_PUBLIC_SUPABASE_URL` is the local API URL from `pnpm supabase:status`, `www` is using the local Supabase stack

Use remote Supabase when:
- you need real or branch data already hosted remotely
- you are only working on frontend behavior and public content integration

Use local Supabase when:
- you need to verify schema-dependent features locally
- you are changing API behavior that depends on local tables, storage, or policies
- you need an isolated environment before touching preview or production

### Important auth note

The shared `supabase/config.toml` has auth site URLs aimed at the internal app on port `3001`.

That is not a blocker for `apps/www`, because the public site does not depend on Supabase Auth sign-in flows for its main behavior.
`apps/www` primarily uses Supabase for data access, writes, and storage.

### Handoff checklist for Supabase specifically

Make sure the next developer receives:
- the exact Supabase project for `www` preview and production
- dashboard access or at minimum read access to inspect tables and storage
- confirmation that the `applications` bucket exists
- confirmation that `public_inquiries`, `job_applications`, and `audit_logs` exist in the target environment
- confirmation that anon reads for `business_units`, `job_postings`, and `employee_directory` work in the target environment
- the correct runtime env values for local, preview, and production

### Remote migration workflow

Yes, remote migration application is part of this repo's workflow, and you have used that pattern before.

The important detail is that the repo migration script is not automatically local-only.

Repo-level migration command:

```bash
pnpm db:migrate
```

What that resolves to:
- root script `pnpm --filter @hr-portal/database migrate`
- package script `supabase db push --workdir ../..`

Implication:
- this targets the currently linked Supabase project by default
- if the CLI is linked to staging or production, `pnpm db:migrate` is a remote migration operation

Safe mental model:
- `pnpm db:migrate` means "push pending migrations to the linked Supabase project"
- `pnpm exec supabase db push --local --workdir .` means "apply migrations to the local stack only"

Recommended safe workflow before any remote migration:

1. Confirm which environment should receive the migration.
2. Confirm the Supabase CLI is linked to that exact project.
3. Review pending migrations in `supabase/migrations/`.
4. Run the migration push intentionally, not from muscle memory.
5. Verify the affected tables, views, policies, and storage objects afterward.

Use local-only push when the intent is local schema verification:

```bash
pnpm exec supabase db push --local --workdir .
```

Use remote push only when the linked project is definitely the intended remote target:

```bash
pnpm db:migrate
```

### Important remote migration caution

Do not tell the next developer to run `pnpm db:migrate` casually while doing `www` setup.

Why:
- `apps/www` itself does not usually need schema changes just to boot
- the shared repo migration command can affect staging or production if the CLI is linked remotely
- this monorepo shares one Supabase schema across `apps/www`, `apps/web`, and backend workflows

Only run remote migrations for `www` work if one of these is true:
- a required table/view/bucket for `www` is missing in the target environment
- a new migration was intentionally added for public-site content or schema support
- the handoff specifically includes a schema rollout step for preview or production

### Verified repo behavior from prior work

This repo already has a verified note that remote migration history needed repair on a staging project and was fixed by linking the CLI to the remote project and running a remote `db push` with explicit intent.

That is the clearest evidence that, yes, you have used the remote migration path before in this codebase.

### What to tell the next developer

Tell her this exactly:
- `apps/www` needs the correct remote Supabase environment values to run
- it does not normally need to apply migrations during first-time setup
- if a schema mismatch appears, confirm whether the missing object should be fixed locally or on the linked remote project before running any push command

## 9. Local Setup Walkthrough

### Step 1: Install dependencies
From repo root:

```bash
pnpm install
```

### Step 2: Add app env file
Create `apps/www/.env.local` from `.env.example` and fill the real values.

### Step 3: Start the site
From repo root:

```bash
pnpm dev
```

Or only the app package:

```bash
pnpm --filter @sn-group/www dev
```

Expected result:
- site available at `http://localhost:3000`

### Step 4: Smoke-check the pages
Check at minimum:
- `/`
- `/about`
- `/team`
- `/contact`
- `/privacy`
- `/terms`

### Step 5: Smoke-check the forms
Test:
- inquiry form on `/contact`
- public inquiry flow on business pages if sections are restored
- job application flow if careers is restored and visible

## 10. What To Review First As The New Owner

Recommended order:
1. Read `src/lib/site-config.ts` to understand URL and feature-flag behavior.
2. Read `src/lib/supabase/server.ts` to understand anon vs admin client boundaries.
3. Read `src/lib/email.ts` to understand email side effects and required env vars.
4. Read the API routes in `src/app/api`.
5. Read `src/data/placeholder.ts` and `../docs/apps/www/real-data-checklist.csv` to see where mock data still exists.
6. Read `../docs/apps/www/hidden-sections-2026-03-30.md` before turning hidden sections back on.
7. Read `../docs/apps/www/testing-guide.md` before doing any final QA pass.

## 11. Known Risks and Gaps

These are the main risks the next developer should know immediately.

### Hidden-section dependency risk
Large sections are hidden because content and data wiring are incomplete. Turning the flag off without completing those dependencies will expose placeholder or partial content.

### Placeholder-content risk
Several parts of the public site still depend on `src/data/placeholder.ts` or mixed placeholder plus live data.

Reference:
- `../docs/apps/www/real-data-checklist.csv`

### Form integration risk
`/api/applications` depends on:
- service-role access
- storage bucket availability
- audit log inserts
- optional ATS event dispatch
- Resend for confirmations

If one of those environments is missing, the flow can partially degrade.

### Asset and branding risk
The UI audit notes several places where premium-brand polish or real assets are still missing.

Reference:
- `../docs/apps/www/ui-enhancement-checklist.md`

### Docs drift risk
This repo previously referenced `apps/www/README.md` from `docs/README.md`, but the file did not exist. This document is intended to be the source-of-truth entry point going forward.

## 12. Testing Workflow

### Narrow validation
For the app only:

```bash
pnpm --filter @sn-group/www typecheck
pnpm build:www
```

### Repo-wide quality checks when needed
From repo root:

```bash
pnpm lint
pnpm typecheck
```

### Manual QA
Use the dedicated guide:
- `../docs/apps/www/testing-guide.md`

Minimum release QA checklist:
- navigation works on desktop and mobile
- hidden routes stay hidden when the flag is enabled
- contact form validates and submits
- email side effects work in the target environment
- no broken images on public pages
- portal/login links point to the correct app URL
- metadata and canonical URLs match the deployed domain

## 13. Deployment Walkthrough

### Deployment model
The public site is deployed from the repo root using the root `vercel.json`.

Relevant root config:
- `buildCommand`: `pnpm build:www`
- `installCommand`: `pnpm install`
- `framework`: `nextjs`

### Step 1: Confirm Vercel project target
Make sure the linked Vercel project is the public-site project, not the HR portal.

### Step 2: Configure Vercel environment variables
Set every variable required by `apps/www` in the correct Vercel environment scopes.

At minimum set for Production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WWW_URL`
- `RESEND_API_KEY`
- `INQUIRY_NOTIFICATION_EMAIL`

Set these if used:
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL`
- `NEXT_PUBLIC_GOOGLE_BOOKING_URL`
- `NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL`
- `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS`
- `INNGEST_EVENT_KEY`
- `INNGEST_BASE_URL`

### Step 3: Preview deploy
From repo root:

```bash
vercel
```

Or from the linked project context the team already uses.

Check in preview:
- public pages render
- no env-related runtime failures
- forms submit to the expected Supabase target
- emails route to the expected inbox
- hidden routes remain blocked if the flag is enabled

### Step 4: Production deploy
From repo root:

```bash
vercel --prod
```

### Step 5: Post-deploy production verification
Verify:
- `https://www.sngroup.com.au`
- security headers are present
- canonical URLs use the production domain
- contact form works end-to-end
- application form works if exposed
- login link sends users to the correct portal URL
- sitemap and robots behavior are correct

## 14. Recommended First Tasks For The Next Developer

If she is taking over today, this is the safest order of execution.

1. Boot the app locally and verify the current public scope.
2. Confirm the production env inventory and who owns each secret.
3. Verify that preview and production Vercel projects are linked correctly.
4. Decide whether hidden sections stay hidden or will be restored in this phase.
5. Work through `real-data-checklist.csv` before exposing deferred routes.
6. Run a final typecheck and build before any release.

## 15. Reference Documents

Primary references:
- `../docs/README.md`
- `../../supabase/config.toml`
- `../docs/guides/local-supabase-workflow.md`
- `../docs/apps/www/hidden-sections-2026-03-30.md`
- `../docs/apps/www/priority-handoff.csv`
- `../docs/apps/www/real-data-checklist.csv`
- `../docs/apps/www/testing-guide.md`
- `../docs/apps/www/ui-enhancement-checklist.md`
- `../docs/deployment/VERCEL_DEPLOYMENT.md`

## 16. Practical Handoff Script

If you are walking her through this live, use this sequence.

1. Show the repo root scripts in `package.json` and explain that `pnpm dev` defaults to `apps/www`.
2. Show `apps/www/.env.example` and explain which variables are mandatory versus optional.
3. Show `src/lib/site-config.ts` and the hidden-section flag behavior.
4. Show `src/lib/supabase/server.ts` and explain anon reads versus admin writes.
5. Show `src/app/api/inquiries/route.ts` and `src/app/api/applications/route.ts` because those are the highest-risk server flows.
6. Show the current hidden-routes log so she does not accidentally expose unfinished areas.
7. Run local dev, then typecheck, then a production build.
8. Walk through the Vercel project, env vars, preview deploy, and production deploy.

## Change Log

- Added the missing `apps/www/README.md` expected by `docs/README.md`.
- Consolidated project ownership, setup, data flow, testing, deployment, and Supabase configuration into one handoff document.
- Documented the hidden-section feature flag and the production risks around placeholder content and form integrations.

## Programmatic Connection

This document connects the existing public-site code paths to the operational workflow around them:
- route files connect to page ownership and QA scope
- API routes connect to Supabase tables, storage, audit logs, email, and ATS hooks
- env vars connect runtime behavior to Vercel deployment configuration
- hidden-section docs connect unfinished features to release-safe behavior

## Mental Model

Think of `apps/www` as a marketing shell with three layers:
- presentation layer in `src/app` and `src/components`
- integration layer in `src/lib` and `src/app/api`
- operational layer in env vars, Supabase, Resend, and Vercel

Most regressions on this app happen at the boundaries between those layers, not in isolated UI markup.

## Senior Review

Redundancy:
- This file is intentionally the single entry point because the repo already advertised it from `docs/README.md`.

Abstraction:
- The guide stays at the app-ownership level instead of duplicating every page-level behavior already covered by the testing guide.

Predictability:
- The walkthrough follows the monorepo reality of this repository: root scripts, root Vercel config, app-local envs, and shared packages.

Performance:
- The highest deployment risk remains content and integration drift, not raw rendering performance. Before restoring hidden sections, verify the data and asset sources first.
