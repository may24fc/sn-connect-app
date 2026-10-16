\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  target_user_id uuid;
  target_employee_id uuid;
  target_cycle_id uuid := gen_random_uuid();
  parallel_cycle_id uuid := gen_random_uuid();
BEGIN
  SELECT u.id, e.id
  INTO target_user_id, target_employee_id
  FROM public.users u
  JOIN public.employees e ON e.user_id = u.id AND e.deleted_at IS NULL
  WHERE u.account_kind = 'workforce'
    AND u.deleted_at IS NULL
  ORDER BY u.created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Local validation needs one workforce employee';
  END IF;

  INSERT INTO public.review_cycles (id, name, start_date, end_date, status)
  VALUES (target_cycle_id, 'Former roster validation', '2098-01-01', '2098-03-31', 'draft');

  INSERT INTO public.review_cycles (id, name, start_date, end_date, status)
  VALUES (parallel_cycle_id, 'Parallel roster validation', '2098-01-01', '2098-03-31', 'draft');

  UPDATE public.users SET status = 'terminated' WHERE id = target_user_id;

  IF public.is_quarter_workforce_eligible(
    target_user_id,
    '2098-01-01'::date,
    '2098-03-31'::date
  ) THEN
    RAISE EXCEPTION 'Former employee without selected-quarter data was eligible';
  END IF;

  INSERT INTO public.okrs (employee_id, cycle_id, objective)
  VALUES (target_employee_id, target_cycle_id, 'Validate historical roster evidence');

  IF NOT public.is_quarter_workforce_eligible(
    target_user_id,
    '2098-01-01'::date,
    '2098-03-31'::date
  ) THEN
    RAISE EXCEPTION 'Former employee with selected-quarter OKR was not eligible';
  END IF;

  IF NOT public.is_performance_cycle_workforce_eligible(target_user_id, target_cycle_id) THEN
    RAISE EXCEPTION 'Former employee with selected-cycle OKR was not eligible';
  END IF;

  IF public.is_performance_cycle_workforce_eligible(target_user_id, parallel_cycle_id) THEN
    RAISE EXCEPTION 'Former employee leaked into a parallel cycle with matching dates';
  END IF;

  IF public.is_quarter_workforce_eligible(
    target_user_id,
    '2098-04-01'::date,
    '2098-06-30'::date
  ) THEN
    RAISE EXCEPTION 'Former employee leaked into a quarter without data';
  END IF;
END$$;

ROLLBACK;

SELECT 'okr_kpi_former_quarter_roster_local_ok' AS result;
