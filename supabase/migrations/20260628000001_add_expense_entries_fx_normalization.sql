-- Migration: Add FX normalization fields to expense_entries
-- Created: 2026-06-28
-- Description: Stores AUD-normalized values and FX metadata for deterministic reporting.

BEGIN;

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS exchange_rate_to_aud numeric(14,8),
  ADD COLUMN IF NOT EXISTS total_amount_aud numeric(12,2),
  ADD COLUMN IF NOT EXISTS tax_amount_aud numeric(12,2),
  ADD COLUMN IF NOT EXISTS fx_rates_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS fx_source text DEFAULT 'open_exchange_rates';

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_exchange_rate_to_aud_nonnegative
  CHECK (exchange_rate_to_aud IS NULL OR exchange_rate_to_aud >= 0);

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_total_amount_aud_nonnegative
  CHECK (total_amount_aud IS NULL OR total_amount_aud >= 0);

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_tax_amount_aud_nonnegative
  CHECK (tax_amount_aud IS NULL OR tax_amount_aud >= 0);

CREATE INDEX IF NOT EXISTS idx_expense_entries_transaction_date
  ON public.expense_entries(transaction_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_department_processing_status
  ON public.expense_entries(employee_id, processing_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_total_amount_aud
  ON public.expense_entries(total_amount_aud)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.expense_entries.exchange_rate_to_aud IS 'Applied FX rate from source currency to AUD at ingestion/update time';
COMMENT ON COLUMN public.expense_entries.total_amount_aud IS 'Normalized total amount in AUD for analytics and executive reporting';
COMMENT ON COLUMN public.expense_entries.tax_amount_aud IS 'Normalized tax amount in AUD';
COMMENT ON COLUMN public.expense_entries.fx_rates_fetched_at IS 'Timestamp of fx_rates snapshot used for conversion';
COMMENT ON COLUMN public.expense_entries.fx_source IS 'FX provider/source metadata for auditability';

COMMIT;
