# Invoice Submissions (Admin)

This guide covers invoice submission oversight and conversion checks from the admin side.

## Route Map

- `/admin/invoice` — Invoice submissions matrix and conversion utilities
- `/admin/invoice/create` — Admin-assisted create flow (reuses employee invoice experience)

## Invoice Matrix (`/admin/invoice`)

The admin invoice page focuses on submitted-invoice visibility and payout scheduling:

- Submission matrix by employee
- Payout schedule filtering
- Source currency visibility
- Conversion support (including manual PHP to AUD override)
- Real-time invoice updates

Use this page to quickly identify who has submitted and what needs payroll review.

## Create Flow (`/admin/invoice/create`)

The create route provides an admin entry point to the invoice submission experience with a back link to `/admin/invoice`.

Common use cases:

- Assisted entry for users who need support
- Backfilling invoice data in controlled scenarios

## Related Super Admin Flow

- Super admins perform final invoice approvals in `/super-admin/payroll-approvals`.

## Related Docs

- [Super Admin Features](super-admin.md)
- [API: Invoices](../api/invoices.md)
