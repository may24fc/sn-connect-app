BEGIN;

ALTER TABLE public.wise_batch_import_rows
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN resolved_by uuid REFERENCES public.users(id),
  ADD COLUMN resolution_note text;

CREATE INDEX finance_wise_unresolved_import_month
  ON public.wise_batch_import_rows(imported_at)
  WHERE result <> 'completed' AND resolved_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_finance_report_snapshot(
  target_month date, actor_id uuid, payload jsonb, make_final boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month) + interval '1 month')::date;
  unresolved integer;
  new_id uuid;
BEGIN
  SELECT count(*) INTO unresolved FROM public.expense_entries e
  WHERE e.deleted_at IS NULL AND e.transaction_date >= month_start AND e.transaction_date < month_end
    AND (e.match_status = 'variance_flagged'
      OR (e.source_type = 'staff_request' AND e.match_status = 'unmatched')
      OR e.approval_state = 'pending');
  unresolved := unresolved + (
    SELECT count(*) FROM public.finance_variance_signoffs s
    JOIN public.expense_entries e ON e.id = s.expense_id
    WHERE s.decision = 'pending' AND e.transaction_date >= month_start AND e.transaction_date < month_end
  );
  unresolved := unresolved + (
    SELECT count(*) FROM public.wise_batch_import_rows w
    WHERE w.result <> 'completed' AND w.resolved_at IS NULL
      AND w.imported_at >= month_start AND w.imported_at < month_end
  );
  IF make_final AND unresolved > 0 THEN
    RAISE EXCEPTION 'Resolve all month-end ledger and Wise import exceptions before finalizing';
  END IF;
  INSERT INTO public.finance_report_snapshots(report_month, status, report_data, exception_count, created_by, finalized_at)
  VALUES(month_start, CASE WHEN make_final THEN 'final' ELSE 'draft' END, payload, unresolved, actor_id,
    CASE WHEN make_final THEN now() ELSE NULL END) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) TO service_role;

COMMIT;
