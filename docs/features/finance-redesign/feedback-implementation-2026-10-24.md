# Finance Feedback Implementation Handoff â€” 2026-10-24

This document is the durable implementation plan for the feedback in:

- `SN Control Hub - Finance Feedback.pdf` â€” 14 pages
- `Notes - SN Control Hub (Testing).pdf` â€” 9 pages

The PDFs were text-extracted and reviewed on 2026-10-24. The second PDF contains the detailed test outcomes and is treated as the later source when it clarifies or supersedes the first summary.

## Continuation Rules

1. Read this file, [task-tracker.md](task-tracker.md), [pending-decisions.md](pending-decisions.md), and [optimization.md](optimization.md) before editing.
2. Use local Supabase for migrations, fixtures, cleanup, and browser verification. Do not apply the migrations or delete records in production without an explicit production request.
3. Read [optimistic-ui.md](../../apps/web/architecture/optimistic-ui.md) before changing an expense, subscription, property, match, or report mutation. These Finance mutations are server-confirmed unless that document is deliberately updated.
4. Keep the existing month-end, Wise, sign-off, and property-scope placeholders where the PDFs say the policy is on hold.
5. After each implementation group, update the status and evidence below. Do not mark an item Done until its focused validation passes.
6. Every rendered UI change needs focused local Playwright verification and an inspected screenshot.

## Status Summary

| Area | Status | Resume or completion condition |
| --- | --- | --- |
| Correctness and data repair, items 1â€“7 | Deployed | Four migrations applied locally and to production; web typecheck, focused tests, production build, and admin browser route matrix passed. |
| Workflow and UI improvements, items 8â€“17 | Deployed | Unified review list, app-shell navigation/spacing, totals, forms, subscription/property fields, dialog edits, status colors, and Finance date formatting implemented. |
| Additional testing findings, items 18â€“20 | Deployed | Self-approval controls, readable snapshot view, and next eligible payout implemented and focused checks passed. |
| Test-record cleanup | Done in production | The owner identified production project `tccdupkjmwwxcvpqnpeb`. The initial cleanup removed active records and property/subscription dependencies. A 27 October PDF re-audit removed the remaining archived expenses, test snapshots, and receipt artifacts; a broad post-check found zero PDF-named records and the Overview counts matched 6/1/1/29. |
| On-hold policies | Deferred | Resume only when May/Tina supply the policy or sanitized Wise fixtures identified below. |

## 2026-10-24 Implementation Result

- Added local migrations `20261026000001` through `20261026000004` for AUD/category repairs, server-derived matching payment confirmation, subscription billing currency, property details/cadence, Overview FX detail, and complete filtered ledger totals.
- Added audited Finance corrections for payment source/status and legacy receipt attachment/replacement.
- Required a business purpose for log and upload flows and added per-receipt category, payment source, and purpose controls.
- Added the prioritized To review list, semantic status badges, latest-data-month Overview selection, readable saved snapshots, next-month payout selection, and consistent Finance dates.
- Removed duplicate page navigation, kept shared app typography and shell spacing, and verified the admin desktop/mobile route matrix with inspected screenshots.
- Validation: four migrations applied to local Supabase; 7 focused Vitest assertions passed; web typecheck passed; production web build passed; the focused Finance Playwright run covered the complete admin route matrix, Wise, property workflow, expanded-detail, dark-mode, and subscriptions. A dedicated local Accounting account then passed the complete Finance/Properties route matrix at desktop and mobile widths with no captured console errors, failed local requests, or mobile overflow; representative screenshots were inspected.
- Production migrations `20261026000001` through `20261026000004` were deployed after an exact four-file dry run. Linked history matched afterward and a follow-up production dry run reported the database up to date. The separately authorized production test-record cleanup is recorded below and in the feature tracker.

## Feedback Inventory and Implementation Plan

### 1. AUD receipts excluded from Overview totals

- **Status:** Done
- **Evidence:** October 2026 Overview showed recorded spend `0.00`, seven items awaiting FX, and no category spend while the report snapshot totaled AUD 4,035.10.
- **Finding:** The Finance overview RPC sums `total_amount_aud` and counts null values as unconverted. Some older AUD rows have `total_amount_aud = null`; report calculations already fall back to `total_amount` when `currency = AUD`.
- **Implementation:**
  - Add a local migration that backfills `total_amount_aud = total_amount` and `exchange_rate_to_aud = 1` for active AUD expense rows where normalization is missing.
  - Update Finance overview/trend SQL to use `coalesce(total_amount_aud, total_amount)` for AUD rows so future incomplete legacy data cannot disappear.
  - Ensure new AUD log/upload paths persist normalized AUD values immediately.
  - Add rollback-only SQL coverage for AUD totals, category spend, and unconverted counts.
- **Likely paths:** `supabase/migrations/`, `apps/web/src/lib/fx/expense-conversion.ts`, expense ingestion/logging APIs, `apps/web/src/lib/finance/overview.ts`.

### 2. Two Expenses destinations

- **Status:** Done
- **Evidence:** Privileged sidebars show both `/expenses` and `/finance/expenses`; Finance â€œNew expenseâ€ opens `/expenses`.
- **Implementation:**
  - Keep `/expenses` as the staff submission/history workspace and label it **My Expenses**.
  - Keep `/finance/expenses` as **Expenses** inside the Finance section for Finance/admin roles.
  - Keep Finance â€œNew expenseâ€ opening the submission workspace, with explicit copy that identifies it as the personal submission flow.
  - Confirm role-specific sidebars do not show duplicate labels.
- **Likely paths:** `packages/ui/src/layout/Sidebar.tsx`, `apps/web/src/app/(app)/finance/expenses/page.tsx`, sidebar/navigation tests.

### 3. Legacy category remapping

- **Status:** Done
- **Evidence:** Meta/Facebook ads remained Other; AWS remained Software; Sydney Data Centre and Coworking remained Utilities; chairs/desks remained Office Supplies.
- **Implementation:** Add a deterministic local migration/backfill for the named legacy vendor patterns:
  - Ads and Meta/Facebook â†’ `advertising_marketing`
  - AWS and Sydney Data Centre â†’ `ai_cloud`
  - Coworking â†’ `rent_workspace`
  - Chairs and desks â†’ `equipment`
  - Restrict the update to active records and record rollback-only fixture evidence for matching and non-matching vendors.
- **Likely paths:** `supabase/migrations/`, `apps/web/src/lib/finance/categories.ts`, SQL fixture under `tests/sql/`.

### 4. Legacy Paid with, Payment, and Receipt fields cannot be completed

- **Status:** Done
- **Evidence:** Older rows show Paid with Unknown, Payment Unknown, Receipt Awaiting; card tabs remain empty.
- **Implementation:**
  - Add a Finance-authorized, server-confirmed ledger metadata correction endpoint.
  - Permit editing payment source and payment confirmation without rewriting the amount/vendor/date.
  - Permit attaching or replacing the receipt for a legacy row; receipt status remains derived from actual document presence.
  - Retain audit evidence for actor, timestamp, and changed fields.
  - Add an Edit action in Finance All expenses and card tabs.
- **Likely paths:** new `apps/web/src/app/api/finance/expenses/[id]/route.ts`, Finance expense table/editor, audit helper, API/UI tests.

### 5. Matching does not update Payment and exposes manual result selection

- **Status:** Done
- **Evidence:** Matched rows remained Unknown/Unpaid; users manually selected Matched, Variance flagged, or Resolved manually.
- **Implementation:**
  - Remove `matchStatus` from client input; the server/RPC derives exact match versus amount difference from the linked entries.
  - A successful match marks the direct-payment record confirmed and presents the request as paid/confirmed.
  - User-facing reconciliation statuses become **Matched**, **Unmatched**, and **Amount differs**. Keep any internal resolved state only where needed for retained variance history and map it to clear display copy.
  - Preserve the reason-required variance sign-off flow.
- **Likely paths:** `apps/web/src/lib/schemas/expense.schema.ts`, match API/RPC migration, admin expense review UI, `apps/web/src/hooks/useExpenses.ts`, focused match tests.

### 6. Business purpose is optional

- **Status:** Done
- **Evidence:** Log Request and Upload Receipt saved without justification and review displayed None.
- **Implementation:**
  - Require trimmed business purpose on both the UI and server boundary.
  - Apply a practical maximum and a non-empty minimum.
  - For multi-file upload, require a purpose for each receipt or an explicitly copied shared purpose before submission.
  - Return field-specific validation errors.
- **Likely paths:** employee Expenses page, `expenseLogRequestSchema`, receipt ingestion payload/schema, hooks and API tests.

### 7. Receipt quality check rejects valid portrait/digital receipts

- **Status:** Done
- **Evidence:** A 600Ã—820 image failed resolution; a clean 1240Ã—1754 digital receipt intermittently failed blur.
- **Implementation:**
  - Evaluate orientation independently: long side against 1024 and short side against a reduced phone-safe minimum rather than fixed width/height orientation.
  - Loosen the blur threshold and avoid rejecting clean high-resolution digital receipts solely on the current Laplacian score.
  - Keep low-resolution and low-contrast guidance actionable.
  - Add landscape, portrait-phone, clean-digital, genuinely blurry, and low-contrast tests.
- **Likely paths:** `apps/web/src/lib/expenses/image-quality.ts`, `tests/lib/expenses-image-quality.test.ts`.

### 8. Consolidate To review into one prioritized list

- **Status:** Done
- **Evidence:** Approval Queue, Matching Queue, Variance Review, and Settled Ledger are separate; category copy appears as `ai cloud`.
- **Implementation:**
  - Render one active review queue ordered: amount differences, approvals, unmatched requests.
  - Move settled records to All expenses.
  - Use canonical Finance category names such as **AI & Cloud**.
  - Preserve server-confirmed review actions and role safeguards.
- **Likely paths:** Finance Expenses review tab, `FinanceApprovalQueue`, admin expense review components, category helpers.

### 9. Duplicate Finance navigation

- **Status:** Done
- **Evidence:** Sidebar and page-level Overview/Expenses/Staff Payments/Reports buttons duplicate one another.
- **Implementation:**
  - Use the sidebar as the single Finance navigation.
  - Remove the page-level Finance navigation rows.
  - Rename Finance sidebar items to **Overview**, **Expenses**, **Staff Payments**, and **Reports** within the Finance group.
  - Preserve selected-month query state only where navigation still needs it through in-page controls.
- **Likely paths:** four Finance pages, `packages/ui/src/layout/Sidebar.tsx`, navigation tests and Playwright spec.

### 10. Overview defaults, recurring tools, and FX detail

- **Status:** Done
- **Evidence:** Overview initially opened on an empty month and the FX card showed a count without amount/currency.
- **Later-test clarification:** Subscription run rate, annualized run rate, and AI & Cloud subtotal passed in T7. Do not rewrite correct run-rate math.
- **Implementation:**
  - When no month query is supplied, default to the latest month containing active expense data; fall back to the current month only when there is no data.
  - Return and display unconverted totals grouped by original currency, alongside the count.
  - Keep the currently passing subscription calculations.
- **Likely paths:** Finance Overview page, overview RPC migration/types/helper/tests.

### 11. Totals for filtered card and maintenance lists

- **Status:** Done
- **Evidence:** Personal card, Company card, and Maintenance views showed correct rows without totals.
- **Implementation:**
  - Display the total and row count for the current filtered expense list, grouped by currency when conversion is unavailable.
  - Display total recorded maintenance cost for the selected property month.
  - Totals must reflect the complete filtered result, not only the current pagination slice.
- **Likely paths:** Finance Expenses page/query, property summary/panel, helper/API tests.

### 12. Color-coded statuses

- **Status:** Done
- **Evidence:** Pending, Unknown, Variance Flagged, Due, and Overdue visually blend together.
- **Implementation:** Use accessible semantic badges with text labels for approved/confirmed, pending/unknown, unmatched, amount differs, due, overdue, and paid. Do not rely on color alone.
- **Likely paths:** Finance Expenses table/status helper, Finance Properties panel, focused component/page tests.

### 13. Expense form layout and per-receipt editing

- **Status:** Done
- **Evidence:** Category was clipped, Log Request scrolled horizontally, and bulk-upload rows could not change Category/Paid with after OCR.
- **Implementation:**
  - Make both dialogs fit the viewport with responsive single-column mobile layout and contained scrolling.
  - Replace the shared bulk metadata controls with per-receipt review rows after OCR for Category, Paid with, and Business purpose.
  - Simplify upload instructions and expose validation beside each file.
- **Likely paths:** employee Expenses page, ingestion hooks/components, focused responsive Playwright scenario.

### 14. Subscription billing currency

- **Status:** Done
- **Evidence:** Subscription form accepts Monthly AUD only; many tools bill in USD.
- **Implementation:**
  - Add billing amount and ISO currency to subscriptions while retaining nullable normalized AUD for reporting.
  - For AUD, normalized amount equals billing amount. For non-AUD, use the existing FX verification service or leave normalized AUD explicitly awaiting conversion; never label foreign face value as AUD.
  - Display original billing currency and use converted AUD only for AUD run-rate totals.
  - Migrate existing values as AUD.
- **Likely paths:** local migration, generated database types, catalog API/panel, overview/report types and tests.

### 15. Property ID, agent, rent account, and cadence

- **Status:** Done
- **Evidence:** Add property only captures name, type, tenant, weekly rent, and due day.
- **Implementation:**
  - Add unique property code, optional agent, optional receiving-account label, and rent cadence (`weekly` or `biweekly`).
  - Store the rent amount for the selected cadence and calculate monthly default as weekly Ã— 52 Ã· 12 or biweekly Ã— 26 Ã· 12.
  - Version cadence and rent amount in effective-month terms so historical months stay unchanged.
  - Avoid storing bank credentials or full sensitive account data; use a Finance-facing account label/reference.
- **Likely paths:** local migration, generated types, property API/helper/panel, SQL/API/helper/UI tests.

### 16. Property edit forms open off-screen

- **Status:** Done
- **Evidence:** Edit expected rent and Change terms render at the top after the user clicks a lower property card.
- **Implementation:** Present these forms in the app Dialog component, focused and centered, with the selected property named in the title. Close on successful save and restore focus to the trigger.
- **Likely paths:** `FinancePropertiesPanel.tsx`, component test, desktop/mobile Playwright interaction.

### 17. One Finance date format

- **Status:** Done
- **Evidence:** Finance surfaces mix ISO, `Oct 21, 2026`, and numeric dates.
- **Implementation:** Use the shared formatter for display text in scoped Finance, Properties, reports, and invoice surfaces, targeting `30 Oct 2026`. Keep ISO values for form controls, URLs, CSV machine fields, and API payloads.
- **Likely paths:** `apps/web/src/lib/format.ts`, Finance/property/invoice components and page tests.

### 18. Disable self-approval before click

- **Status:** Done
- **Evidence:** Server correctly blocked self-approval, but the Approve button looked available.
- **Implementation:** Keep the server safeguard and disable/hide the control for the submitter with explanatory text or tooltip.
- **Likely paths:** Finance approval queue/review components and focused UI test.

### 19. Render saved snapshots as a readable view

- **Status:** Done
- **Evidence:** Save draft and CSV worked, but View saved snapshot opened raw JSON.
- **Implementation:** Render saved snapshot sections inside the Reports UI or a dedicated authorized page; retain CSV download and never expose raw JSON as the primary user view.
- **Likely paths:** `FinanceReportControls.tsx`, reports API/page, report-pack types and tests.

### 20. Offer the next eligible payout date

- **Status:** Done
- **Evidence:** Invoice submission showed only two past October payout dates and blocked submission with â€œPayout schedule required.â€
- **Implementation:** When both current-month payouts are closed, include the next monthâ€™s first eligible payout option. Preserve the 3:00 PM PHT cutoff and two-payout monthly policy.
- **Likely paths:** `apps/web/src/lib/payroll/payoutSchedule.ts`, invoice submission UI, payout schedule unit tests.

## Test Record Cleanup

### Records named in the feedback

- Expenses beginning `TEST` in October 2026
- `L1 TEST â€“ Sample Airline`, AUD 820.50, 10 Oct 2026
- `SAMPLE STATIONERY CO`, AUD 45.60, 20 Oct 2026
- Subscriptions `TEST â€“ SUB1`, `SUB2`, `SUB3`, and `SUB4`
- Properties `TEST â€“ PT1`, `PT2`, and `PT3`, including linked payments, maintenance, and expected-rent override

### Status: Done in production; fully reverified on 27 Oct 2026

The owner identified production project `tccdupkjmwwxcvpqnpeb` as the target. On 24 October, the guarded cleanup soft-deleted nine active October expense rows and removed three existing test subscriptions (`SUB1` was already absent) plus all three test properties and their reviewed dependencies. Audit evidence was retained.

On 27 October, a fresh broad scan using the names from both PDFs found eleven archived expense rows (the nine above plus two already archived), two saved draft report snapshots that still embedded test data, and eight linked receipt document rows/storage objects. Those exact artifacts were removed. A final broad scan found zero matching expenses, subscriptions, properties, snapshots, invoices, documents, sign-offs, or AI-expense sources. The production October Overview then returned exactly six requests to match, one amount difference, one pending approval, and twenty-nine submitted invoices, matching the feedback's expected post-cleanup state. No production migration was applied during either cleanup.

## Confirmed Passing or Intentionally Unchanged

- Self-approval is blocked at the server; item 18 improves the UI affordance.
- Amount-difference sign-off requires a reason.
- Subscription run rate, annualized total, and AI & Cloud subtotal matched the register in T7.
- Draft snapshot, saved snapshot, and CSV creation work; item 19 improves readability.
- Rent override and first-of-month term changes work.
- Rent overdue calculation, rent recording, maintenance with/without invoice reference, vacant properties, and separation of property records from Finance Expenses passed.
- SFO changes are listed as N/A in the feedback and are outside this implementation.
- Other property costs remain maintenance-only until Tina expands the scope.

## Deferred Policy Items

| Item | Current behavior | Resume condition |
| --- | --- | --- |
| Complete blockers for Mark final | Final remains paused; drafts remain available. | May confirms the full blocker list. |
| Wise end-to-end file test | Batch download remains available with pending-test messaging; no live transfer is initiated. | May provides Wise Business access plus approved sanitized blank-template and past-result files. |
| Finance access to Staff Payments admin steps | Admin-only. | May approves a role/access change. |
| Amount-difference threshold | Existing behavior remains labelled interim. | May confirms whether 10% or AUD 100 is the approved rule. |
| Stevenâ€™s personal expenses | Existing safeguards remain; no new owner assumption. | May/Tina confirm who logs and independently signs off; the PDF suggests May signs off but still lists the policy on hold. |

## Proposed Implementation Order

1. Correctness foundation: items 1, 3, 5, 6, and 7.
2. Expense workflow: items 4, 8, 11, 12, 13, and 18.
3. Navigation and Overview: items 2, 9, and 10.
4. Subscription and Properties schema: items 14, 15, and 16.
5. Reporting, dates, and payroll: items 17, 19, and 20.
6. Apply all new migrations to **local Supabase only**, regenerate database types, and run rollback-only SQL fixtures.
7. Run focused tests for each boundary, then focused Playwright on the changed routes and roles. Update the tracker and this document with exact evidence.
8. Run `graphify update .` because this plan includes migrations, API changes, and more than five source files.

## Validation Checklist

- [ ] AUD receipt appears in Overview recorded spend and category totals without FX conversion.
- [ ] Non-AUD rows show original-currency amount awaiting conversion.
- [ ] Sidebar labels distinguish My Expenses from Finance Expenses and duplicate page navigation is gone.
- [ ] Named legacy vendors map to the requested categories in the local SQL fixture.
- [ ] Finance can correct legacy payment source/status and attach a receipt with audit evidence.
- [ ] Match outcome is derived by the server and confirmed matches update payment state.
- [ ] Log and upload reject blank business purpose.
- [ ] Portrait and clean digital receipt fixtures pass; genuinely bad images fail.
- [ ] Review queue is one prioritized list with canonical category labels.
- [ ] Overview defaults to latest data month when no month is supplied.
- [ ] Filtered card and maintenance totals are complete and correctly labelled.
- [ ] Status badges remain understandable without color.
- [ ] Expense dialogs do not overflow at 390px; bulk rows have editable metadata.
- [ ] USD subscription is stored/displayed as USD and not included as face-value AUD.
- [ ] Weekly and biweekly property defaults calculate correctly and historical terms remain stable.
- [ ] Property term/override dialogs open next to the userâ€™s focus and close after save.
- [ ] Scoped Finance dates display as `30 Oct 2026` while machine values remain ISO.
- [ ] Submitter cannot interact with their own Approve action.
- [ ] Saved snapshot opens as readable Finance content.
- [ ] Closed current-month payout schedule offers the next eligible payout.
- [ ] Focused type/tests and Playwright pass; screenshots are inspected; local servers are stopped.
