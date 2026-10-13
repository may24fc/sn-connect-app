# Finance Redesign Pending Decisions

This file records open decisions and the answers already received. Do not ship behavior that depends on an open answer by assuming a default. Update this file and the [task tracker](task-tracker.md) when a decision is made.

## Property terms changing during a month

- **Status:** Resolved and implemented locally (2026-10-13).
- **Question:** When occupancy, tenant, weekly rent, or due day changes partway through a month, how should that month's expected rent and overdue balance be calculated?
- **Option A:** Terms take effect from the first of a selected month; no partial-month proration. This is simpler, but a mid-month vacancy or rent change must be assigned to a month explicitly.
- **Option B:** Terms take effect on the exact date and rent is prorated for the affected month. This requires a day-count convention and a rule for how the monthly due date applies to split periods.
- **Recommendation:** Option A, if Finance uses monthly accounting periods and does not require partial-month rent accounting.
- **Decision:** Option A. Terms take effect from the first of a selected month with no daily proration. Finance may enter one expected-rent override per property/month by adding the weekly amounts, such as `2 × 650 + 2 × 700 = 2,700`. A later term leaves earlier months unchanged.
- **Implementation:** Local migration `20261013000001_finance_property_terms.sql`, Property Development API/calculation/UI, and rollback-only SQL/API/helper/browser tests. Production deployment was not requested.

## Complete month-end Final policy

- **Status:** Pending (updated 2026-10-13). Earlier direction to block unresolved Wise exceptions and list unknown direct-payment confirmations remains implemented as a conservative safeguard, but Finance has not confirmed the complete list of conditions that permit Final.
- **Question:** Should final Finance report snapshots be blocked by unresolved Wise result-import exceptions, expense entries whose payment status is `unknown`, or both? The current finalization gate covers pending approvals, unmatched requests, and unresolved variances, but not those two categories.
- **Options:** Block both; block only unresolved Wise exceptions; block only unknown payment confirmations; or list them as exceptions without blocking finalization.
- **Recommendation:** Block unresolved Wise exceptions that belong to the report month and display unknown payment statuses explicitly while Finance determines whether every payment source requires confirmation. No finalization rule should silently treat `unknown` as paid.
- **Interim behavior:** Draft snapshots remain available. Final creation is paused in both the report UI and API. Existing pending-approval, unmatched-request, variance, unresolved-Wise, and unknown-payment reporting logic remains visible and is not treated as the approved complete policy.
- **Resume condition:** Finance confirms every blocker for Final and whether unknown payment confirmations block or remain listed only.

## Personal-expense sign-off and amount differences

- **Status:** Pending (2026-10-13).
- **Questions:** Who independently signs off Steven's personal expenses for segregation of duties? What absolute and/or percentage difference between invoice and reported amount requires extra sign-off?
- **Interim behavior:** Existing review owners and conservative review safeguards remain available, but the UI labels them interim and does not describe the old 10%/AUD 100 behavior or COO routing as approved policy.
- **Resume condition:** May/Finance confirms the independent approver and exact threshold rules.

## Optional budgets

- **Status:** Resolved and implemented (2026-10-13).
- **Decision:** Finance may monitor without any budget limit. Spend by category, changes versus the prior month, subscription run rate, and renewals stay visible. Budget alerts/meters and category limit inputs stay hidden when no positive limits are set; users may open the optional controls and clear an existing limit.

## External Wise verification

- **Status:** Awaiting safe artifacts (reconfirmed 2026-10-13); the Finance UI now shows an external file-test pending badge.
- **Question:** Which real saved-recipient CSV header/template and completed-transfer response may be used for a non-payment validation run?
- **Blocked work:** End-to-end verification of the generated batch CSV against a real Wise template and a real completed-transfer result.
- **Resume condition:** Provide sanitized, approved fixtures; do not issue a live transfer to manufacture test evidence.

## Production migration prerequisite outside Finance

- **Status:** Resolved (2026-10-07)
- **Finding:** An explicit production Supabase CLI dry-run listed seven pending migrations, including `20261007000002_add_replied_at_to_uhp_clients.sql`. Without `--include-all`, the CLI refuses to push the later Finance migrations because they precede the latest applied production version; with it, the UHP migration is included.
- **Decision:** The user subsequently authorized applying all migrations pending on 2026-10-07, including the UHP prerequisite. An explicit production push applied versions 00002, 00003, 00005, 00006, 00007, 00009 and 00010. The four 2026-10-12 Finance migrations were deployed on 2026-10-12. The 2026-10-13 property-term migration remains local only.
- **Validation:** Read-only production reconciliation found one AI source row and one matching active expense ledger row (AUD 50.00), zero duplicate/missing/mismatched/orphan IDs, and zero property, rent-payment, maintenance and status-event rows. No production fixtures, manual backfill or Wise transfers were run.
