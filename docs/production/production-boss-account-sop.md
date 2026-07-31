# Production Boss Account SOP

This document defines the controlled procedure for creating real `admin` and `super_admin` accounts for production leadership access.

The preferred path is now the in-app privileged invite flow. Manual Supabase-admin provisioning remains the fallback path if the UI flow is unavailable.

## Preferred Path

Use the in-app privileged invite flow.

Current production-safe behaviour:
- `admin` users can still invite `employee` and `associate`
- only `super_admin` users can invite `admin` and `super_admin`
- privileged invites are created as immediately active accounts
- privileged invites do not go through onboarding

Relevant files:
- [apps/web/src/app/api/users/invite/route.ts](../apps/web/src/app/api/users/invite/route.ts)
- [apps/web/src/components/admin/InviteUserModal.tsx](../apps/web/src/components/admin/InviteUserModal.tsx)
- [apps/web/src/app/(admin)/admin/directory/page.tsx](../apps/web/src/app/(admin)/admin/directory/page.tsx)

## When To Use Manual Provisioning

Use manual Supabase-admin provisioning only if:

- the in-app privileged invite flow is unavailable
- the UI is down during a production incident
- a controlled recovery flow is required outside the app

## Role Policy

Recommended production policy:

- One `super_admin` maximum unless a second one is explicitly justified
- All other leadership users should be `admin`
- Do not hand out `super_admin` for convenience

Reason:
- `super_admin` should remain the smallest possible trust boundary

## Required Inputs Per User

Prepare these before creating the account:

- Full legal or working name
- Real company email address
- Target role: `admin` or `super_admin`
- Department
- Position title
- Temporary password delivery method
- Person responsible for verifying first login

## Security Rules

- Use real company emails only
- Use a strong temporary password
- Share credentials through a secure channel only
- Require password change immediately after first successful access
- Do not store temporary passwords in repo files or chat logs
- Keep a separate ops record of who received which role

## Technical Requirements

The app expects role and status alignment across auth metadata and database state.

### Auth Role Requirement

[apps/web/src/contexts/AuthContext.tsx](../apps/web/src/contexts/AuthContext.tsx) reads `app_metadata.db_role` first.

That means the auth user must have:

- `app_metadata.db_role=admin`
or
- `app_metadata.db_role=super_admin`

### Database Status Requirement

The same auth flow also depends on `public.users.status`.

For a live boss account, set:

- `public.users.status='active'`

If status is not `active`, routing may send the user into onboarding-related flows.

### Redirect Behaviour

[apps/web/src/lib/auth/redirect-config.ts](../apps/web/src/lib/auth/redirect-config.ts) routes authenticated users based on role and status.

Expected outcomes:
- `super_admin` goes to `/super-admin/dashboard`
- `admin` goes to `/admin/dashboard`
- `pending_onboarding` goes to onboarding setup
- `awaiting_approval` goes to onboarding waiting page

## Provisioning Procedure

Follow this sequence for each leadership account.

### Step 1: Confirm Preconditions

- [ ] Production data reset is complete
- [ ] Mock auth is disabled
- [ ] Final live app URL is configured
- [ ] Preferred path available: authenticated `super_admin` can access the directory invite flow
- [ ] Fallback path available: operator has secure access to Supabase admin capabilities if manual provisioning is needed

Important sequencing note:

- If you are wiping the current production project, do not invite the full leadership team before the wipe.
- Either preserve one known-good bootstrap `super_admin` through the reset, or manually create one immediately after the reset.
- Then use that bootstrap account to invite the remaining real `admin` and `super_admin` users.

### Step 2: Preferred In-App Provisioning

Preferred sequence:

- [ ] Sign in as a `super_admin`
- [ ] Open the directory page
- [ ] Use `Invite Leadership`
- [ ] Select `admin` or `super_admin`
- [ ] Enter real user details
- [ ] Share the one-time temporary password securely

Result of the privileged invite flow:

- auth user is created or refreshed
- `app_metadata.db_role` is set
- `public.users.status` is set to `active`
- a matching employee record is created if missing
- onboarding is skipped for the privileged account

### Step 3: Manual Fallback Provisioning

Create a Supabase Auth user with:

- real email
- strong temporary password
- confirmed email
- `app_metadata.db_role` set to `admin` or `super_admin`

### Step 4: Create or Upsert the `public.users` Row

Create the matching `public.users` record using the exact same user ID.

Required minimum fields:
- `id`
- `role`
- `status='active'`

### Step 5: Create or Upsert the `public.employees` Row

Create a matching employee record so admin pages that expect employee context do not fail.

Use minimal real values only:
- name
- position
- department
- company email
- date hired

### Step 6: Record the Assignment

Outside the codebase, document:

- name
- email
- role
- date provisioned
- who approved the role
- who verified login

## What Not To Do

Do not:

- Use the standard employee or associate invite flow for boss accounts
- Reuse test-account passwords such as `password`
- Leave the account in `pending_onboarding`
- Assign `super_admin` broadly
- Share credentials in plain group chat

## Verification Checklist

Run after each account is created.

Primary verification command:
- `pnpm check:leadership-accounts`
- Optional targeted check: `pnpm check:leadership-accounts boss@company.com`
- Optional fallback mode: `pnpm check:leadership-accounts --allow-manual-fallback`

- [ ] Auth user exists
- [ ] Email is correct
- [ ] `app_metadata.db_role` is correct
- [ ] `public.users.role` is correct
- [ ] `public.users.status` is `active`
- [ ] `public.employees` record exists
- [ ] Login succeeds
- [ ] Redirect target is correct
- [ ] Intended dashboard loads
- [ ] Unauthorized dashboard does not load

## First-Login Validation

For each new boss account, verify:

### Admin account

- [ ] Can access `/admin/dashboard`
- [ ] Cannot improperly access super-admin-only flows
- [ ] Can perform intended admin actions

### Super-admin account

- [ ] Can access `/super-admin/dashboard`
- [ ] Can access super-admin-only flows
- [ ] Can perform intended sensitive operations

## Operational Reference

The current pattern for privileged-account creation already exists in script form at:

- [scripts/create-admin-test-accounts.mjs](../scripts/accounts/create-admin-test-accounts.mjs)

Use it as a fallback reference for manual flow only.

Do not use it unchanged in production because it contains test emails, test passwords, and test-oriented assumptions.

## Post-Launch Follow-Up

After launch, the preferred improvement is to implement a proper production-safe privileged invite flow with:

- explicit role approval rules
- audited account creation
- secure credential handling
- clearer first-login password reset handling

That is a follow-up implementation item, not a launch blocker for this SOP.

## References

- [apps/web/src/app/api/users/invite/route.ts](../apps/web/src/app/api/users/invite/route.ts)
- [apps/web/src/components/admin/InviteUserModal.tsx](../apps/web/src/components/admin/InviteUserModal.tsx)
- [apps/web/src/contexts/AuthContext.tsx](../apps/web/src/contexts/AuthContext.tsx)
- [apps/web/src/lib/auth/redirect-config.ts](../apps/web/src/lib/auth/redirect-config.ts)
- [scripts/create-admin-test-accounts.mjs](../scripts/accounts/create-admin-test-accounts.mjs)
- [docs/production-launch-checklist.md](production-launch-checklist.md)

---

Last updated: 2026-04-02