# Checklist Management

This guide covers checklist template management for onboarding and offboarding workflows.

## Routes

- `/admin/checklists`
- `/super-admin/checklists`

Both roles can view and manage checklist templates. Super admins additionally control cross-team governance and rollout timing.

## What You Can Do

1. Create checklist templates for recurring processes.
2. Add ordered checklist items with clear completion criteria.
3. Edit existing templates when policy or process changes.
4. Archive templates that should no longer be assigned.

## Recommended Template Structure

Use consistent sections to reduce onboarding friction:

- Identity and compliance documents
- Payroll and banking setup
- Equipment and systems access
- Team orientation and role-specific setup
- Final verification and sign-off

## API Surface

- `GET /api/checklist-templates` - List templates
- `POST /api/checklist-templates` - Create template

For complete request and response details, see [API Reference](../api/README.md).

## Operational Notes

- Keep checklist item text action-oriented and measurable.
- Prefer template updates over ad hoc one-off tasks to preserve consistency.
- Review archived templates quarterly before permanent cleanup.

---

Next: [Company Pulse](company-pulse.md) · Previous: [Tickets](tickets.md)
