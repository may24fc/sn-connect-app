# Finance Redesign Pending Decisions

Decisions here are deliberately unresolved. Do not ship behavior that depends on an answer by assuming a default. Update this file and the [task tracker](task-tracker.md) when a decision is made.

## Property terms changing during a month

- **Status:** Pending (2026-10-07)
- **Question:** When occupancy, tenant, weekly rent, or due day changes partway through a month, how should that month's expected rent and overdue balance be calculated?
- **Option A:** Terms take effect from the first of a selected month; no partial-month proration. This is simpler, but a mid-month vacancy or rent change must be assigned to a month explicitly.
- **Option B:** Terms take effect on the exact date and rent is prorated for the affected month. This requires a day-count convention and a rule for how the monthly due date applies to split periods.
- **Recommendation:** Option A, if Finance uses monthly accounting periods and does not require partial-month rent accounting.
- **Blocked work:** Effective-dated property terms and their historical rent/overdue calculations; do not retroactively change previous months using current terms. Maintenance status progression and correction of mistaken payment entries can proceed independently.
- **Resume condition:** A Finance owner chooses the effective-date/proration rule (and, for Option B, the day-count and split due-date rules).

## Month-end Wise and payment exceptions

- **Status:** Pending (2026-10-07)
- **Question:** Should final Finance report snapshots be blocked by unresolved Wise result-import exceptions, expense entries whose payment status is `unknown`, or both? The current finalization gate covers pending approvals, unmatched requests, and unresolved variances, but not those two categories.
- **Options:** Block both; block only unresolved Wise exceptions; block only unknown payment confirmations; or list them as exceptions without blocking finalization.
- **Recommendation:** Block unresolved Wise exceptions that belong to the report month and display unknown payment statuses explicitly while Finance determines whether every payment source requires confirmation. No finalization rule should silently treat `unknown` as paid.
- **Blocked work:** Changing the report-snapshot finalization gate or counting either category as a blocking exception.
- **Resume condition:** A Finance owner chooses which categories block a final snapshot and how each is assigned to a report month.

## External Wise verification

- **Status:** Awaiting safe artifacts (2026-10-07)
- **Question:** Which real saved-recipient CSV header/template and completed-transfer response may be used for a non-payment validation run?
- **Blocked work:** End-to-end verification of the generated batch CSV against a real Wise template and a real completed-transfer result.
- **Resume condition:** Provide sanitized, approved fixtures; do not issue a live transfer to manufacture test evidence.

## Production migration prerequisite outside Finance

- **Status:** Resolved (2026-10-07)
- **Finding:** An explicit production Supabase CLI dry-run listed seven pending migrations, including `20261007000002_add_replied_at_to_uhp_clients.sql`. Without `--include-all`, the CLI refuses to push the later Finance migrations because they precede the latest applied production version; with it, the UHP migration is included.
- **Decision:** The user subsequently authorized applying all pending migrations, including the UHP prerequisite. An explicit production push applied versions 00002, 00003, 00005, 00006, 00007, 00009 and 00010. Production migration history matches local and a subsequent production dry-run reports up to date.
- **Validation:** Read-only production reconciliation found one AI source row and one matching active expense ledger row (AUD 50.00), zero duplicate/missing/mismatched/orphan IDs, and zero property, rent-payment, maintenance and status-event rows. No production fixtures, manual backfill or Wise transfers were run.
