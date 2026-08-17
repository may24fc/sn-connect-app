# Marketing Submissions & Dashboard Plan

## Goal
Build a dedicated ad-spend feature with:
- an overview dashboard for overall and monthly spend
- a manual entry details view for direct log entries
- platform-based access enforcement from the existing marketing grant model

This feature is strictly **ad-expense only**. No campaign tracking is included in the UI or naming. The feature is separate from the existing reports and expense desk tools.

## Source Schema
Based on:
- `marketing_entries` (raw spend submissions)
- `marketing_platforms`
- `marketing_access_grants`
- `marketing_platform_totals`
- `marketing_monthly_platform_totals`
- audit triggers already configured on marketing tables

Reference migration:
- `supabase/migrations/20260812000001_create_marketing_spend_tables.sql`

## Scope
### In Scope
1. **Overview Dashboard**
   - overall spend per platform
   - monthly spend per platform
   - period selector for the dashboard (year or all-time)
   - note panel explaining platform billing rules
2. **Manual Entry Details View**
   - date
   - transaction ID
   - payment method
   - amount
   - invoice attachment link
   - quick add form for manual entries
3. **Access Enforcement**
   - admin/super_admin default access
   - grant-based platform scoping for selected users
   - no broad marketing access by default

### Out of Scope
- Campaign tracking UI
- Campaign-specific tabs or modules
- Replacing general expense tracking or reports features
- Schema redesign outside the current marketing spend tables

## Naming Convention (Explicit Campaign vs Ad Spend)
Use distinct naming to prevent confusion between the separate `campaign` domain and the `ad spend` domain.

### Ad spend naming
Use `ad` / `adSpend` in UI, API, and schema-facing logic when referring to direct expense tracking, for example:
- `adSpendEntry`
- `adPlatformId`
- `adExpenseAmount`
- `adInvoiceReference`
- `adSpendOverview`
- `adPlatformAccessGrant`

### Campaign naming
Reserve `campaign` only for the separate campaign domain, for example:
- `marketingCampaign`
- `campaignBudget`
- `campaignStatus`

Avoid generic names like `campaign`, `collection`, or `queue` when the feature is clearly ad expense tracking. Do not reuse campaign naming for ad spend rows, tables, or route handlers.

This feature is intentionally named `ad spend` and not `campaign management`; the app should treat these as separate entities in all naming, code, docs, and UI labels.

## Current Spreadsheet Structure to Mirror
### Overview
1. **Overall Spend per Platform**
   - Meta Ads: currency total
   - Google Ads: currency total
   - Email Marketing: currency total
   - Total: currency total

2. **Monthly Spend per Platform**
   - Columns:
     - Month
     - Meta Ads
     - Google Ads
     - Email Mktg
     - Total per month

3. **Period Selector**
   - use a year selector plus an all-time option instead of month picker for the overview dashboard

### Manual Entry Detail Table
Keep rows shaped like:
- Date
- Transaction ID
- Payment Method
- Amount
- Invoice (link attachment)

Each row represents one ad spend transaction entry, not a campaign record.

## Marketing Team Submission Payload (Ad-Specific App Naming)
Use ad-focused variable names in app/API layer while mapping to existing `marketing_entries` columns:

- `adEntryDate` -> `entry_date` (required)
- `adTransactionId` -> `transaction_id` (optional)
- `adPaymentMethod` -> `payment_method` (optional)
- `adExpenseAmount` -> `amount` (required, >= 0)
- `adInvoiceReference` -> `invoice_reference` (optional)
- `adPlatformId` -> `platform_id` (required)
- `adCurrencyCode` -> `currency` (default `AUD`)
- `adNotes` -> `notes` (optional)

System-managed fields (not user-entered):
- `adSubmittedBy` -> `submitted_by`
- `adEntryStatus` -> `approval_status` (directly logged/approved for this feature path)

## API Plan
Add focused endpoints (or grouped route handlers) for:
- list ad spend entries
- create ad spend entry
- list overview summaries for a selected period (year or all-time)

Validation:
- strict request validation (zod)
- explicit permission checks

## Data/Behavior Rules
1. Marketing users can submit entries only for platforms explicitly granted via `marketing_access_grants`.
2. Admin and super_admin remain the default access gate until grants are assigned.
3. The feature is direct logging only; it does not require campaign records or approval workflows.
4. Dashboard totals are computed from logged entries via summary views.
5. Invoice values are treated as attachment links / references, not campaign metadata.
6. Soft-deleted rows are excluded from default views.
7. Audit trail relies on table audit triggers plus API activity logging for sensitive operations.

## Validation Plan
1. Type-check touched web/api packages.
2. Run targeted tests for new API and UI behavior.
3. Manual smoke checks:
   - confirm overview totals render for selected period
   - confirm monthly per-platform summary matches the spreadsheet pattern
   - confirm manual entry rows render with invoice links
   - verify no campaign-related route is exposed in this feature

## Acceptance Criteria
- The ad-spend section shows overview totals with a period selector (year or all-time).
- The page displays overall and monthly spend tables in the spreadsheet format.
- The manual entry tab shows direct add-entry rows with invoice link attachments.
- The campaign concept is not used in this feature surface.
- Access remains scoped by `marketing_access_grants` and admin/super_admin default access.
- Existing reports and expense flows remain unaffected.
