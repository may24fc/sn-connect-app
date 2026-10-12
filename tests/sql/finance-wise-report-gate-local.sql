-- Local Supabase only. Fixtures and final snapshots roll back.
BEGIN;
DO $$
DECLARE
  actor_id uuid;
  batch_id uuid;
  exception_id uuid;
  rejected boolean := false;
BEGIN
  SELECT id INTO actor_id FROM public.users ORDER BY id LIMIT 1;
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Local user fixture is required'; END IF;
  INSERT INTO public.wise_batches(created_by) VALUES(actor_id) RETURNING id INTO batch_id;
  INSERT INTO public.wise_batch_import_rows(batch_id,transfer_status,result,imported_by,imported_at)
  VALUES(batch_id,'failed','unmatched',actor_id,'2024-02-15') RETURNING id INTO exception_id;
  BEGIN
    PERFORM public.create_finance_report_snapshot('2024-02-01',actor_id,'{}'::jsonb,true);
  EXCEPTION WHEN raise_exception THEN
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Unresolved Wise import did not block February'; END IF;
  UPDATE public.wise_batch_import_rows
  SET resolved_at = now(), resolved_by = actor_id, resolution_note = 'Verified reference outside the batch'
  WHERE id = exception_id;
  PERFORM public.create_finance_report_snapshot('2024-02-01',actor_id,'{}'::jsonb,true);
  IF (SELECT exception_count FROM public.finance_report_snapshots WHERE report_month = '2024-02-01' AND status = 'final') <> 0 THEN
    RAISE EXCEPTION 'Resolved Wise import remained an exception';
  END IF;
END $$;
ROLLBACK;
