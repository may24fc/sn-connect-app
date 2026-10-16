\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  target_user_id uuid;
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
END$$;

ROLLBACK;

SELECT 'privileged_account_kind_local_ok' AS result;
