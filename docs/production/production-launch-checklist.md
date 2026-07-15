# Production Launch Checklist

This document is the operational runbook for launching the Control Hub HR Portal into production.

Scope for this checklist:
- Internal HR portal first
- Real leadership access for `admin` and `super_admin`
- Real employee and associate invites
- Transactional email enabled
- AI assistant enabled only if the final provider decision is complete
- Wise credentials and webhook path prepared before live payroll activity

## Launch Policy

Production must not contain fake examples, fake employees, fake reports, fake tasks, fake payroll data, or demo activity history.

Allowed in production:
- Real department structure
- Real policy and resource content
- Real knowledge-base content
- Real bank registry and payout configuration data
- Intentional empty states
- A real welcome announcement or operational notice

Not allowed in production:
- Demo metrics
- Sample employee profiles
- Placeholder approval history
- Fake notifications
- Test uploads
- Test auth accounts

## Critical Blockers

Do not go live until these are resolved:

1. Deployment target is correct.
   - Root [vercel.json](../vercel.json) is the public-site config for `apps/www`.
   - [apps/web/vercel.json](../apps/web/vercel.json) is the HR portal config for `apps/web`.
   - The web deployment workflow should point to the `apps/web` Vercel project, preferably via `VERCEL_WEB_PROJECT_ID`.
   - Production must deploy the HR portal target you actually intend to launch.

2. Mock auth is disabled.
   - `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false`

3. Leadership accounts are provisioned correctly.
   - `app_metadata.db_role` must match the intended role.
   - `public.users.status` must be `active`.
   - `admin` and `super_admin` invites must be created through the privileged invite flow by a `super_admin`.
   - Run `pnpm check:leadership-accounts` and require a passing result before go-live.

4. Production data is clean.
   - No test users
   - No fake records
   - No fake files

5. Email and credential recovery are validated.

6. AI provider decision is finalized.
   - The live app code currently uses OpenAI in [apps/web/src/app/api/ai/chat/route.ts](../apps/web/src/app/api/ai/chat/route.ts) and [apps/web/src/app/api/ai/suggestions/route.ts](../apps/web/src/app/api/ai/suggestions/route.ts).
   - Package docs still mention Anthropic in [packages/ai/README.md](../packages/ai/README.md).

## Phase 1: Pre-Launch Decision

Choose one production-reset path:

### Option A: Fresh Production Project

Recommended if the current environment has ever held mixed test auth users, test files, and sample content.

Reference bootstrap guide:
- [docs/production/supabase-production-bootstrap.md](supabase-production-bootstrap.md)

Benefits:
- Clean Auth state
- Clean Storage state
- Lower risk of missed test residue
- Easier to audit before launch

### Option B: Full Reset of Current Production Project

Use only if you are certain you can fully remove test residue and reseed baseline content correctly.

Requirements:
- Full database backup
- Storage export if uploads matter
- Explicit preserve-vs-remove list
- Post-reset verification pass

## Phase 2: Backup and Freeze

Complete before deleting or resetting anything:

- [ ] Export full database backup
- [ ] Export storage buckets containing uploaded files
- [ ] Save any test audit history you still want for reference
- [ ] Freeze manual data entry during the reset window
- [ ] Confirm rollback owner and rollback path

## Phase 3: Data Reset Rules

### Required Order

Do not invite real leadership users before a production wipe if you are resetting the current project.

Use this sequence:

- [ ] Back up and freeze the current environment
- [ ] Remove test auth accounts, fake rows, and uploaded test files
- [ ] Confirm the environment is clean
- [ ] Create or preserve exactly one bootstrap `super_admin`
- [ ] Sign in with that bootstrap `super_admin`
- [ ] Invite the remaining real `admin` and `super_admin` users through `Invite Leadership`
- [ ] Run `pnpm check:leadership-accounts`

Reason:
- wiping after leadership invites can delete the real auth users you just created
- wiping after leadership invites also mixes real boss accounts into test-era audit and seed residue
- the UI invite flow needs one working `super_admin`, so one bootstrap account is the only exception

### Preserve

- [ ] Departments
- [ ] Curated resources and policy documents
- [ ] Knowledge sources that are real and approved
- [ ] Bank registry data
- [ ] Real public business-unit or careers content you intend to keep

### Remove

- [ ] Test auth users
- [ ] Fake employees
- [ ] Onboarding test runs
- [ ] Fake tasks
- [ ] Fake reports
- [ ] Fake notifications
- [ ] Fake announcements
- [ ] Fake internships
- [ ] Fake invoices
- [ ] Fake performance reviews and OKRs
- [ ] Uploaded test files

### Production UX Rule After Reset

Use truthful empty states instead of fake examples.

Examples:
- Good: "No reports submitted yet."
- Good: "No announcements have been published."
- Bad: fake report cards, fake leaderboard data, fake onboarding progress, fake staff cards

If you adopt a fresh Supabase project instead of wiping in place:
- use [docs/production/supabase-production-bootstrap.md](supabase-production-bootstrap.md) as the source of truth
- import only approved baseline data instead of copying the current mixed environment

## Phase 4: Environment Configuration

Primary reference: [docs/ENVIRONMENT.md](ENVIRONMENT.md)

Required production checks:

- [ ] `NEXT_PUBLIC_ENABLE_MOCK_AUTH=false`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `NEXT_PUBLIC_SITE_URL` set to live app URL
- [ ] `NEXT_PUBLIC_APP_URL` set to live app URL
- [ ] `APP_URL` set to live app URL
- [ ] `CRON_SECRET` set
- [ ] `RESEND_API_KEY` set
- [ ] Wise variables set if payroll is in scope
- [ ] AI provider variables match the actual runtime implementation

## Phase 5: Boss Access Verification

Provision leadership accounts using the privileged invite flow described in [docs/production-boss-account-sop.md](production-boss-account-sop.md).

Order dependency:
- complete the production reset first
- keep or manually create exactly one bootstrap `super_admin`
- use that account to invite the remaining real leadership users

Preferred path:
- A `super_admin` opens the directory page and uses the `Invite Leadership` action.
- The invite flow creates `admin` or `super_admin` users as immediately active accounts.
- Leadership invites do not go through onboarding.

Fallback path:
- Manual Supabase-admin provisioning should be used only if the UI flow is unavailable.

Verify for each leadership user:

- [ ] Auth user exists
- [ ] `app_metadata.db_role` is correct
- [ ] `public.users.status` is `active`
- [ ] Login succeeds
- [ ] User lands on correct dashboard
- [ ] User is not sent to onboarding
- [ ] Route access matches intended privileges

Operational check:
- Run `pnpm check:leadership-accounts`
- For one-off validation, run `pnpm check:leadership-accounts boss@company.com`
- Use `pnpm check:leadership-accounts --allow-manual-fallback` only if you intentionally used the manual fallback SOP and have an approved ops record for it

## Phase 6: Integration Verification

### Email

- [ ] Invite email delivery works
- [ ] Password reset email delivery works
- [ ] Onboarding approval email delivery works

### AI

- [ ] AI provider decision is complete
- [ ] API key is set for the selected provider
- [ ] Assistant answers against real knowledge content
- [ ] Spend cap or usage monitoring is enabled

### Wise

- [ ] Required credentials collected
- [ ] Credential handoff is complete using [docs/WISE_CREDENTIALS_COLLECTION_FORM.md](WISE_CREDENTIALS_COLLECTION_FORM.md)
- [ ] Webhook configuration is ready
- [ ] Live payroll is either verified or explicitly deferred

### Storage and Uploads

- [ ] Production buckets exist
- [ ] Upload permissions work for non-admin users
- [ ] Test files are not visible

## Phase 7: Smoke Test Sequence

Run in this order:

1. Leadership login
2. Standard employee invite
3. Employee first login
4. Password reset
5. Onboarding submission and approval
6. Admin dashboard access
7. Super-admin dashboard access
8. File upload path
9. AI assistant query
10. Cron-protected route verification
11. Wise webhook readiness check

## Final Go / No-Go Gate

All items below must be true:

- [ ] Correct app is deployed
- [ ] Production data is clean
- [ ] Baseline reference content is present
- [ ] Leadership accounts work
- [ ] Invite and recovery flows work
- [ ] Mock auth is disabled
- [ ] Email is working
- [ ] AI decision is finalized
- [ ] Wise decision is finalized
- [ ] Rollback path is documented
- [ ] Usage alerts are enabled

If any of the above is false, the launch is `NO-GO`.

## References

- [docs/production-boss-account-sop.md](production-boss-account-sop.md)
- [docs/production-cost-model.md](production-cost-model.md)
- [docs/ENVIRONMENT.md](ENVIRONMENT.md)
- [docs/WISE_CREDENTIALS_COLLECTION_FORM.md](WISE_CREDENTIALS_COLLECTION_FORM.md)
- [vercel.json](../vercel.json)
- [apps/web/src/app/api/users/invite/route.ts](../apps/web/src/app/api/users/invite/route.ts)
- [apps/web/src/contexts/AuthContext.tsx](../apps/web/src/contexts/AuthContext.tsx)
- [apps/web/src/lib/auth/redirect-config.ts](../apps/web/src/lib/auth/redirect-config.ts)

---

Last updated: 2026-04-02