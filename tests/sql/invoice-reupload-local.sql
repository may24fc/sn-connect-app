-- Run against local Supabase only after migration 20261030000003.
-- The transaction rolls back all fixture rows.
BEGIN;

DO $$
DECLARE
  employee_uuid uuid;
  other_employee_uuid uuid;
  invoice_number_value text := 'reupload-test-' || gen_random_uuid()::text;
  deleted_invoice_uuid uuid;
  replacement_invoice_uuid uuid;
  other_employee_invoice_uuid uuid;
  duplicate_rejected boolean := false;
BEGIN
  SELECT min(id::text)::uuid, max(id::text)::uuid
  INTO employee_uuid, other_employee_uuid
  FROM public.employees
  WHERE deleted_at IS NULL;

  IF employee_uuid IS NULL OR other_employee_uuid IS NULL OR employee_uuid = other_employee_uuid THEN
    RAISE EXCEPTION 'Local test requires two active employee fixtures';
  END IF;

  INSERT INTO public.invoices
    (employee_id, invoice_number, period_start, period_end, gross_amount, net_amount)
  VALUES
    (employee_uuid, invoice_number_value, current_date, current_date, 100, 100)
  RETURNING id INTO deleted_invoice_uuid;

  UPDATE public.invoices
  SET deleted_at = now()
  WHERE id = deleted_invoice_uuid;

  INSERT INTO public.invoices
    (employee_id, invoice_number, period_start, period_end, gross_amount, net_amount)
  VALUES
    (employee_uuid, invoice_number_value, current_date, current_date, 100, 100)
  RETURNING id INTO replacement_invoice_uuid;

  INSERT INTO public.invoices
    (employee_id, invoice_number, period_start, period_end, gross_amount, net_amount)
  VALUES
    (other_employee_uuid, invoice_number_value, current_date, current_date, 100, 100)
  RETURNING id INTO other_employee_invoice_uuid;

  BEGIN
    INSERT INTO public.invoices
      (employee_id, invoice_number, period_start, period_end, gross_amount, net_amount)
    VALUES
      (employee_uuid, invoice_number_value, current_date, current_date, 100, 100);
  EXCEPTION WHEN unique_violation THEN
    duplicate_rejected := true;
  END;

  IF NOT duplicate_rejected THEN
    RAISE EXCEPTION 'A second active invoice was accepted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE id = deleted_invoice_uuid AND deleted_at IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE id = replacement_invoice_uuid AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE id = other_employee_invoice_uuid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Deleted history or employee-scoped active invoices were not retained';
  END IF;

  RAISE NOTICE 'Deleted number reused; same number accepted for another employee; duplicate for one employee rejected; audit row retained';
END $$;

ROLLBACK;
