# CRM and Lead Tracking

This guide covers the CRM workspace used by admins and super admins to track SFO leads and technology inquiries.

## Route Map

- `/admin/crm` — Primary CRM dashboard
- `/super-admin/crm` — Super admin role-prefixed entry (redirects to admin CRM)

## CRM Dashboard (`/admin/crm`)

The CRM page is organized into tracker tabs:

- **Meta leads** — Social/Meta-originated lead pipeline
- **Google Ads leads** — Paid acquisition lead pipeline
- **Tech inquiries** — B2B and technical inquiry pipeline

Each tracker supports:

- Status and stage updates
- Assignment and follow-up metadata
- Edit/delete controls (permission-scoped)
- Timeline-friendly list/cards for active records

## Access Management

CRM access can be delegated using the CRM access manager controls.

Typical actions:

1. Grant tracker access to selected non-admin users
2. Restrict access by tracker (`meta_leads`, `google_ads_leads`, `tech_inquiries`)
3. Revoke access immediately when needed

## Pipeline Context

Each record keeps context for handoff and reporting:

- Source/channel
- Contact details
- Follow-up status/date
- Notes and remarks
- Assigned representative

## Related Docs

- [Recruitment](recruitment.md)
- [Super Admin Features](super-admin.md)
- [API: CRM](../api/crm.md)
