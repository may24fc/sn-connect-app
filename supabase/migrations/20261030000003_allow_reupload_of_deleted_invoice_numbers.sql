-- Keep invoice numbers unique among active invoices while allowing a replacement
-- upload after an earlier invoice has been soft-deleted. Deleted rows stay intact
-- for audit history.
BEGIN;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

DROP INDEX IF EXISTS public.idx_invoices_invoice_number;

CREATE UNIQUE INDEX idx_invoices_invoice_number
  ON public.invoices (invoice_number)
  WHERE deleted_at IS NULL;

COMMIT;
