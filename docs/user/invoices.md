# Invoices (Payroll)

The Invoice page (`/invoice`) lets you submit payroll invoices and track their approval status.

> **Note:** This feature is available to employees only. Interns do not have access to invoices.

## Invoice Overview

Four stats cards at the top summarize your submissions:

| Card | Description |
|------|-------------|
| **Total Invoices** | Lifetime invoice count |
| **Approved** | Number of approved invoices |
| **Pending** | Invoices awaiting review |
| **Total Approved Amount** | Sum of all approved invoices (PHP) |

## Submitting an Invoice

1. Click the **"Submit Invoice"** button
2. Fill in the submission form:

| Field | Required | Description |
|-------|----------|-------------|
| Pay period | Yes | Select the pay period (start and end dates) |
| Invoice amount | Yes | Enter the amount in PHP |
| Document | Yes | Upload the invoice file |
| Notes | No | Additional context for the reviewer |

3. Click **Submit**

Your invoice appears in the submission history table with a **Pending** status.

## Invoice Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Submitted and waiting for Super Admin review |
| **Approved** | Accepted — payment will be processed |
| **Rejected** | Returned with reviewer notes — check the reason |

## Viewing Invoice Details

Click any row in the submission history to open the invoice detail dialog:

- Full invoice information (number, period, amount, date)
- Uploaded document preview
- Reviewer notes (for approved or rejected invoices)
- **Download** button to save the invoice document

## What Happens After Submission

1. Your invoice enters the **Super Admin's Payroll Approvals** queue
2. A Super Admin reviews the invoice, amount, and attached document
3. They either **Approve** or **Reject** with notes
4. The status updates on your Invoice page

If rejected, review the notes, correct the issue, and submit a new invoice.

---

Next: [Performance](performance.md) · Previous: [Reports](reports.md)
