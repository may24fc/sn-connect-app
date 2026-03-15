# User Story Gap Plan - 2026-03-13

This document captures the repo audit for the requested user stories and lists only the gaps that should be implemented in a follow-up agent session.

## 1. International Phone Validation

### Audit

- `libphonenumber-js` is already used in both `employee.schema.ts` and `onboarding.schema.ts`.
- `PhoneInput` already supports country switching and flag icons.
- `StepPersonalInfo.tsx` already uses `PhoneInput` for both phone fields.
- `tests/lib/validation/phone.test.ts` covers valid numbers and short/long invalid numbers.

### Gaps

- `PhoneInput` does not enforce dial-code prefixing when the country changes.
- There is no explicit `Global` phone mode/fallback in the validation pipeline or the UI country list.
- The current schema validation calls `isValidPhoneNumber(...)` directly instead of using a shared country-aware helper pipeline.
- `phone.test.ts` does not cover invalid Italian prefix cases.
- `CLAUDE.md` does not explicitly mandate `libphonenumber-js` for future contact-related features.

### Implementation Plan

1. Refactor phone validation into a shared helper in `apps/web/src/lib/validation/phone.ts` with:
   - supported-country validation for the 10 core countries;
   - a `GLOBAL` fallback path for full E.164-style numbers;
   - helper APIs that accept both the raw number and optional selected country.
2. Update `apps/web/src/lib/schemas/employee.schema.ts` and `apps/web/src/lib/schemas/onboarding.schema.ts` to use the shared helper instead of inline `isValidPhoneNumber(...)` calls.
3. Upgrade `packages/ui/src/components/forms/PhoneInput.tsx` to:
   - add a `GLOBAL` option;
   - normalize the input when country changes;
   - prefix the dial code when the field is empty or clearly local;
   - preserve an already valid international number instead of double-prefixing.
4. Verify all onboarding phone fields still use `PhoneInput`.
   - `apps/web/src/app/(employee)/onboarding/setup/components/StepPersonalInfo.tsx` is already compliant.
   - `apps/web/src/app/(employee)/onboarding/setup/components/StepPaymentInfo.tsx` should be kept aligned.
5. Extend `tests/lib/validation/phone.test.ts` with:
   - invalid Italian prefix cases;
   - country-switch normalization cases;
   - `GLOBAL` fallback acceptance/rejection cases.
6. Update `CLAUDE.md` with an explicit rule: contact-related features must use `libphonenumber-js`, not regex-based phone validation.

## 2. Multi-Currency Payroll / Invoices

### Audit

- `fx_rates` table exists in `supabase/migrations/20260227000004_create_fx_rates_table.sql`.
- `update-fx-rates` Edge Function exists and fetches Open Exchange Rates in `supabase/functions/update-fx-rates/index.ts`.
- Invoice schema already includes `sourceCurrency`, `targetCurrency`, `exchangeRate`, and `convertedAmount`.
- `/super-admin/payroll-approvals` can display original and converted amount together when converted data exists.

### Gaps

- No `CurrencySelector` usage was found in the app pages.
- The employee invoice creation screen is `apps/web/src/app/(employee)/invoice/page.tsx`, not `apps/web/src/app/(employee)/payroll/page.tsx`.
- Invoice creation currently hardcodes `sourceCurrency: 'PHP'` and `targetCurrency: 'PHP'`.
- `POST /api/invoices` does not persist `source_currency`, `target_currency`, `exchange_rate`, or `converted_amount`.
- `POST /api/invoices/[id]/submit` does not snapshot the exchange rate at submission time.
- The payroll approvals table does not expose dedicated `source_currency` and `converted_amount` columns.
- Runtime activation of the Edge Function / cron / secret storage cannot be verified from repo code alone.

### Implementation Plan

1. Correct the target UI file for invoice creation:
   - use `apps/web/src/app/(employee)/invoice/page.tsx` as the primary employee invoice page.
2. Integrate `CurrencySelector` into:
   - `apps/web/src/app/(employee)/invoice/page.tsx` for source/target selection;
   - `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx` if approvers need a display/base-currency control.
3. Use `apps/web/src/lib/fx/rates.ts` to compute a live preview before saving.
4. Persist currency fields in `apps/web/src/app/api/invoices/route.ts`:
   - map request values to `source_currency`, `target_currency`, `exchange_rate`, `converted_amount`;
   - reject invalid or missing rate data when source and target currencies differ.
5. Snapshot the exchange rate at submission in `apps/web/src/app/api/invoices/[id]/submit/route.ts`:
   - if the invoice is still draft and currencies differ, load the latest FX rate and freeze `exchange_rate` + `converted_amount` before changing status to `submitted`;
   - do not recompute later during approval.
6. Refactor `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx` to show explicit columns for:
   - original amount;
   - source currency;
   - converted amount;
   - target/base currency.
7. Add API and hook typing in `apps/web/src/hooks/useInvoices.ts` so the currency fields are first-class, not cast through `Record<string, unknown>`.
8. Verify deployment config outside code for `OPEN_EXCHANGE_RATES_API_KEY`:
   - store as Supabase secret / Vault entry;
   - ensure the Edge Function schedule is enabled.

## 3. Bank Registry During Onboarding

### Audit

- `bank_registry` exists with RLS and 35 seeded entries in `supabase/migrations/20260227000005_create_bank_registry.sql`.
- `payment_bank_id` foreign key exists on `onboarding_profiles`.
- `/api/banks` already includes `GLOBAL` banks via `.or(...)` and has `s-maxage=3600` with SWR.
- `BankSelector` supports country filtering and an `Other` option.

### Gaps

- `StepPaymentInfo.tsx` uses a hardcoded bank list instead of `/api/banks`.
- `StepPaymentInfo.tsx` does not reset the selected bank when `paymentCountryCode` changes.
- The onboarding API route does not currently persist `payment_bank_id`, `payment_bank_name`, or `payment_country_code`.
- The `Other` fallback captures manual bank text but does not log unlisted banks for registry follow-up.
- No test coverage was found for the payment country -> bank reset flow.

### Implementation Plan

1. Replace the hardcoded bank list in `apps/web/src/app/(employee)/onboarding/setup/components/StepPaymentInfo.tsx` with API-backed data from `/api/banks?country_code=...`.
2. On country change in `StepPaymentInfo.tsx`:
   - clear `paymentBankId`;
   - clear `paymentBankName` when the previous selection is incompatible;
   - keep the selector aligned with the new filtered dataset.
3. Extend `apps/web/src/app/api/onboarding/profile/step/route.ts` to persist:
   - `payment_bank_id`;
   - `payment_bank_name`;
   - `payment_country_code`.
4. Expand `apps/web/src/lib/schemas/onboarding.schema.ts` payment schema to include the bank registry fields explicitly.
5. Add a logging path for unlisted banks when `OTHER` is used.
   - minimum viable approach: structured audit log entry or insert into a follow-up queue/table;
   - avoid dropping this information into plain app logs.
6. Add tests for:
   - `/api/banks` country + `GLOBAL` filtering;
   - `StepPaymentInfo` bank reset on country change;
   - `OTHER` manual-entry flow persistence.

## 4. Unified Employee + Intern Directory

### Audit

- `employee_directory` view exists and excludes soft-deleted users/employees.
- `/admin/directory` already has server-side pagination.
- `useDirectoryExport` exists and supports CSV export.
- Sidebar integration for `Directory` with `Users` icon already exists for both Admin and Super Admin.

### Gaps

- Search is simple `ilike` matching, not fuzzy search.
- The directory page does not provide a working department filter control.
- Role filtering is single-select, not multi-select.
- Department filtering is not multi-select.
- `useDirectoryExport` only supports CSV, not Excel.
- No smoke-test evidence was found for export on a 50+ mixed-record dataset.

### Implementation Plan

1. Decide whether fuzzy search should be implemented:
   - at the SQL layer with trigram / similarity support; or
   - at the API layer with a dedicated ranking strategy.
2. Extend `apps/web/src/app/api/directory/route.ts` to accept multi-value filters for:
   - roles;
   - departments.
3. Update `apps/web/src/app/(admin)/admin/directory/page.tsx` to use multi-select filter UI for roles and departments.
4. Add department filter state wiring.
   - The page currently tracks `departmentFilter`, but the setter is unused for a real filter control.
5. Upgrade `apps/web/src/hooks/useDirectory.ts` and `apps/web/src/app/api/directory/export/route.ts` to support:
   - CSV export;
   - Excel export (`.xlsx`) for the filtered dataset.
6. Add export tests and a smoke test fixture large enough to validate 50+ mixed records.

## 5. Manager / COS Performance Views

### Audit

- `calculate_okr_progress(...)` trigger-based automation exists in `supabase/migrations/20260228000003_create_okr_kpi_functions.sql`.
- `kpis.progress_pct` is implemented as a stored generated column.
- `/admin/performance/employee/[id]` exists and the admin performance list links to it.
- A newer targets-based progress function also exists in `supabase/migrations/20260228000007_okr_targets_redesign.sql`.

### Gaps

- No `apps/web/src/app/(employee)/manager/team-performance/page.tsx` route exists.
- No manager-only team performance screen was found that scopes results to direct reports.
- No Recharts-based trend chart was found on the individual performance detail page.
- The legacy `calculate_okr_progress(...)` function can still fail on malformed JSONB progress values because it casts `(kr.value->>'progress')::numeric` without guarding invalid strings.
- There is architectural drift between the old JSONB key-results progress path and the newer targets-based progress path.

### Implementation Plan

1. Decide the canonical OKR progress path:
   - keep JSONB key-results support and harden it; or
   - fully standardize on `okr_targets` and treat the old function as backwards compatibility only.
2. Harden `calculate_okr_progress(...)` to safely handle malformed JSONB entries.
   - invalid/missing `progress` values should contribute `0`, not raise a cast exception.
3. Create `apps/web/src/app/(employee)/manager/team-performance/page.tsx`.
   - source data should be limited to the authenticated manager’s direct reports only;
   - use existing helper functions such as `get_direct_reports(...)` / manager relationships at the DB or API layer.
4. Add a dedicated API endpoint or query path for manager-scoped performance summaries if one does not already exist.
5. Extend `apps/web/src/app/(admin)/admin/performance/employee/[id]/page.tsx` with time-series trend charts using Recharts.
   - chart candidates: KPI history, OKR progress over time, review cycle trend.
6. Add tests for:
   - malformed JSONB in `calculate_okr_progress(...)`;
   - direct-report scoping for the manager performance page/API;
   - chart rendering fallback states when history data is absent.

## Recommended Execution Order

1. Phone validation hardening.
2. Bank registry onboarding wiring.
3. Multi-currency invoice persistence and UI.
4. Directory filter/export upgrades.
5. Manager performance page and progress-function cleanup.

## Notes For Next Agent Session

- Treat some story items as repo-path corrections, not implementation work. The employee invoice page is `apps/web/src/app/(employee)/invoice/page.tsx`.
- For the FX story, repo code proves the table/function exist, but not that Supabase cron/secrets are active in the target environment.
- For the directory story, the database view already excludes soft-deleted records, so implementation effort should focus on UX/search/export gaps.