\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  target_user_id uuid;
  original_role public.user_role;
  original_kind public.account_kind;
  original_purpose text;
  original_sponsor uuid;
  original_expiry timestamptz;
BEGIN
  SELECT id, role, account_kind, account_purpose, sponsor_user_id, access_expires_at
  INTO target_user_id, original_role, original_kind, original_purpose, original_sponsor, original_expiry
  FROM public.users
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Local validation needs at least one sample account';
  END IF;

  UPDATE public.users
  SET account_kind = 'test', account_purpose = 'Local classification validation'
  WHERE id = target_user_id;

  IF EXISTS (SELECT 1 FROM public.employee_directory WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'Non-workforce account leaked into employee_directory';
  END IF;

  IF public.is_workforce_account(target_user_id) THEN
    RAISE EXCEPTION 'is_workforce_account returned true for a test identity';
  END IF;

  UPDATE public.users
  SET
    role = 'reviewer',
    account_kind = 'reviewer',
    account_purpose = 'Local reviewer validation',
    sponsor_user_id = target_user_id,
    access_expires_at = now() + interval '7 days'
  WHERE id = target_user_id;

  INSERT INTO public.review_engagements (
    reviewer_user_id, sponsor_user_id, purpose, expires_at
  ) VALUES (
    target_user_id, target_user_id, 'Local reviewer validation', now() + interval '7 days'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.review_engagements
    WHERE reviewer_user_id = target_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Reviewer engagement was not created';
  END IF;

  UPDATE public.users
  SET
    role = original_role,
    account_kind = original_kind,
    account_purpose = original_purpose,
    sponsor_user_id = original_sponsor,
    access_expires_at = original_expiry
  WHERE id = target_user_id;
END$$;

ROLLBACK;

SELECT 'controlled_reviewer_access_local_ok' AS result;
