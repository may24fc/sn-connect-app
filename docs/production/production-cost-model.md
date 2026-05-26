# Production Cost Model

This document is a planning sheet for expected production costs and scaling pressure for the Control Hub HR Portal.

It is not an accounting document. It is an operating estimate to help leadership plan monthly spend and avoid surprises.

## Scope

Launch assumptions for this model:

- Internal HR portal is the primary live surface
- Real admin and super-admin access is required
- Employee and intern invite flow is active
- Transactional email is active
- AI assistant is intended to be active
- Wise payroll-related integration is intended to be active

## Executive Summary

Expected fixed monthly platform floor at launch:

- Supabase Pro: from $25/month
- Vercel Pro: $20/month plus usage
- Resend Pro: $20/month if you want dependable production email volume

Practical fixed baseline:
- About $65/month before AI usage and Wise transfer fees

Main variable cost categories:
- AI usage
- Wise transfer and FX fees
- Supabase compute, storage, and egress growth
- Vercel function and bandwidth growth
- Resend email overage

## Current Cost Drivers By Service

### Supabase

Base reference:
- Pro starts from $25/month

Likely cost drivers:
- Compute upgrades
- Database storage growth
- File storage growth
- Egress growth
- Backup or logging add-ons if adopted later

Expected first scaling pressure:
- storage and compute if uploads, knowledge base, and operational data grow steadily

## Vercel

Base reference:
- Pro is $20/month plus usage

Likely cost drivers:
- Function execution
- Bandwidth and data transfer
- Build usage
- Observability add-ons if enabled later

Important repository note:
- [vercel.json](../vercel.json) currently targets `apps/www`
- launch planning here assumes you will correct production deployment to target `apps/web`

## Resend

Base reference:
- Pro is $20/month for 50,000 emails
- overage is $0.90 per 1,000 emails
- Scale is $90/month for 100,000 emails

Likely cost drivers:
- Invite emails
- Password reset emails
- Onboarding decision emails
- future notification volume if more email-based workflows are added

## Open Exchange Rates

Base reference:
- free plan includes 1,000 requests per month

Expected launch impact:
- likely negligible for the current daily FX refresh pattern

## AI Provider

This is the most important budgeting caveat.

Current repo state is inconsistent:
- runtime web routes use OpenAI in [apps/web/src/app/api/ai/chat/route.ts](../apps/web/src/app/api/ai/chat/route.ts)
- runtime suggestions route also uses OpenAI in [apps/web/src/app/api/ai/suggestions/route.ts](../apps/web/src/app/api/ai/suggestions/route.ts)
- package documentation still mentions Anthropic in [packages/ai/README.md](../packages/ai/README.md)

Implication:
- leadership should not approve an AI budget until the production provider is explicitly declared

Budget rule:
- set a monthly spend cap from day one

## Wise

Wise should be treated as a variable operating cost, not a flat monthly platform fee in this planning model.

Why:
- payout costs depend on transfer corridor
- payout costs depend on currency conversion path
- payout costs depend on actual transfer volume

Planning rule:
- review actual Wise pricing for your real payout routes before the first live payroll batch

Operational references:
- [docs/WISE_CREDENTIALS_COLLECTION_FORM.md](WISE_CREDENTIALS_COLLECTION_FORM.md)
- [WISE_WEBHOOK_SETUP.md](../WISE_WEBHOOK_SETUP.md)

## Scenario Model

### Low Usage

Use this if production starts with leadership plus a small pilot group.

Assumptions:
- moderate login traffic
- low email volume
- limited AI usage
- light uploads
- low payout frequency

Expected monthly planning envelope:
- Fixed stack: about $65/month
- With modest AI and operational reserve: about $80 to $150/month

Excludes:
- payroll principal

### Medium Usage

Use this for a normal internal rollout.

Assumptions:
- regular invites and onboarding
- regular recovery emails
- moderate AI assistant usage
- normal upload growth
- ongoing payout-related operations

Expected monthly planning envelope:
- About $150 to $350/month

Excludes:
- payroll principal

### High Usage

Use this for broad internal adoption with heavier operational activity.

Assumptions:
- larger employee population
- heavier AI usage
- larger document and knowledge-base footprint
- regular uploads and download traffic
- repeated payout activity

Expected monthly planning envelope:
- About $350 to $1,000+ per month

Excludes:
- payroll principal

## What Will Likely Increase First

1. Supabase compute and storage
2. Vercel function and bandwidth usage
3. AI token spend
4. Resend monthly volume
5. Wise transfer-related operational fees

## Spend-Control Rules

Apply before launch:

- [ ] Enable Supabase spend cap
- [ ] Enable Vercel usage monitoring and alerts
- [ ] Choose a Resend paid plan before real traffic begins
- [ ] Set AI monthly spend limits and monitor usage weekly
- [ ] Review Wise fees by actual payout corridor before first live payroll run

## First 30-Day Review Plan

Review after production launch:

### Week 1

- Verify actual fixed platform spend
- Verify no accidental AI spike
- Verify no email delivery surge

### Week 2

- Review Supabase storage growth
- Review Vercel function usage
- Review invite and recovery email volume

### Week 4

- Compare real spend to low, medium, and high model
- Decide whether AI cap should move up or down
- Decide whether Resend plan is still sufficient
- Confirm Wise operational cost assumptions with real payout activity

## Risks and Unknowns

These cost areas should be treated as still-open until confirmed:

1. Final AI vendor and model mix
2. Actual Wise payout corridor fees
3. Whether production deploys only the portal or expands quickly into additional public surfaces
4. How quickly uploaded files and knowledge-base content grow

## Recommendations for Leadership Review

Recommended approval posture:

1. Approve the fixed platform baseline immediately
2. Approve a capped AI budget instead of an uncapped one
3. Treat Wise as a separately reviewed operating cost line
4. Revisit the model after 30 days of live usage

## References

- [docs/production-launch-checklist.md](production-launch-checklist.md)
- [docs/production-boss-account-sop.md](production-boss-account-sop.md)
- [docs/ENVIRONMENT.md](ENVIRONMENT.md)
- [vercel.json](../vercel.json)
- [apps/web/src/app/api/ai/chat/route.ts](../apps/web/src/app/api/ai/chat/route.ts)
- [apps/web/src/app/api/ai/suggestions/route.ts](../apps/web/src/app/api/ai/suggestions/route.ts)
- [packages/ai/README.md](../packages/ai/README.md)
- [docs/WISE_CREDENTIALS_COLLECTION_FORM.md](WISE_CREDENTIALS_COLLECTION_FORM.md)

---

Last updated: 2026-04-02