-- Invoice numbers are issued by each employee and commonly restart at values
-- such as 001. Keep them unique for one employee's active invoices while
-- allowing another employee to use the same number.
BEGIN;

DROP INDEX IF EXISTS public.idx_invoices_invoice_number;

CREATE UNIQUE INDEX idx_invoices_invoice_number
  ON public.invoices (employee_id, invoice_number)
  WHERE deleted_at IS NULL;

COMMIT;
