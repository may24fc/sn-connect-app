\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  target_user_id uuid;
  missing_policies text;
BEGIN
  SELECT u.id
  INTO target_user_id
  FROM public.users u
  JOIN public.employees e ON e.user_id = u.id AND e.deleted_at IS NULL
  WHERE u.role::text IN ('admin', 'super_admin')
    AND u.account_kind = 'workforce'
    AND u.deleted_at IS NULL
  ORDER BY u.created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Local validation needs one workforce leadership account';
  END IF;

  UPDATE public.users
  SET account_kind = 'privileged', account_purpose = 'Local privileged identity validation'
  WHERE id = target_user_id;

  IF public.is_workforce_account(target_user_id) THEN
    RAISE EXCEPTION 'Privileged identity remained eligible as workforce';
  END IF;

  IF EXISTS (SELECT 1 FROM public.employee_directory WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'Privileged identity leaked into employee_directory';
  END IF;

  WITH expected_policies(schemaname, tablename, policyname) AS (
    VALUES
      ('public', 'audit_logs', 'audit_logs_select_policy'),
      ('public', 'departments', 'departments_insert_policy'),
      ('public', 'departments', 'departments_update_policy'),
      ('public', 'departments', 'departments_delete_policy'),
      ('public', 'documents', 'documents_update_policy'),
      ('public', 'documents', 'documents_delete_policy'),
      ('public', 'knowledge_source_versions', 'knowledge_versions_admin_read_policy'),
      ('public', 'knowledge_source_versions', 'knowledge_versions_admin_insert_policy'),
      ('public', 'reports', 'reports_select_admin_policy'),
      ('public', 'reports', 'reports_insert_policy'),
      ('public', 'reports', 'reports_update_policy'),
      ('public', 'reports', 'reports_delete_policy'),
      ('public', 'report_metrics', 'report_metrics_select_policy'),
      ('public', 'report_metrics', 'report_metrics_insert_policy'),
      ('public', 'report_metrics', 'report_metrics_update_policy'),
      ('public', 'report_metrics', 'report_metrics_delete_policy'),
      ('public', 'resource_categories', 'resource_categories_read_policy'),
      ('public', 'resource_categories', 'resource_categories_insert_policy'),
      ('public', 'resource_categories', 'resource_categories_update_policy'),
      ('public', 'resource_categories', 'resource_categories_delete_policy'),
      ('public', 'standup_recordings', 'standup_recordings_delete_admin_policy')
  )
  SELECT string_agg(format('%I.%I/%I', e.schemaname, e.tablename, e.policyname), ', ')
  INTO missing_policies
  FROM expected_policies e
  LEFT JOIN pg_policies p
    ON p.schemaname::text = e.schemaname
   AND p.tablename::text = e.tablename
   AND p.policyname::text = e.policyname
  WHERE p.policyname IS NULL
     OR concat_ws(' ', p.qual, p.with_check) NOT ILIKE '%super_admin%';

  IF missing_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Privileged policy parity is missing for: %', missing_policies;
  END IF;
END$$;

ROLLBACK;

SELECT 'privileged_account_kind_local_ok' AS result;
