# Executive Expense Desk

This guide covers the admin expense desk for matching, review, settlement, and analytics.

## Route Map

- `/admin/expenses` — Expense desk (matching, exceptions, settled)
- `/admin/expenses/analytics` — Analytics dashboard for trends and category/status breakdowns

## Expense Desk (`/admin/expenses`)

The expense desk is split into three tabs:

- **Matching** — Work queue for matching-related review
- **Exceptions** — Variance-flagged records requiring leadership action
- **Settled** — Auto-approved, approved, and rejected outcomes

Core capabilities:

- Search and date-range filtering
- Department and processing status filters
- Leadership approve/reject actions with notes
- Entry deletion with confirmation
- CSV/XLSX exports using current filter scope

## Analytics (`/admin/expenses/analytics`)

Analytics view includes:

- Period selector (`week` or `month`)
- Department and processing status filters
- Spend trend visualizations
- Category and status breakdown charts
- Month-over-month movement when monthly scope is selected

## Typical Workflow

1. Triage flagged exceptions in `/admin/expenses`
2. Record approve/reject decisions with rationale
3. Export datasets for finance reporting
4. Review macro trends in `/admin/expenses/analytics`

## Related Docs

- [Reports Analytics](reports.md)
- [Super Admin Features](super-admin.md)
- [API: Expenses](../api/expenses.md)
