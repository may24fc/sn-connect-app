-- Ensure newly added department achievements are granted to intern@example.com
-- after badge catalog expansion migrations.

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT u.id
    INTO v_user_id
    FROM auth.users au
    JOIN public.users u ON u.id = au.id
   WHERE lower(au.email) = 'intern@example.com'
     AND u.deleted_at IS NULL
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Seed skipped: user intern@example.com not found';
    RETURN;
  END IF;

  -- Re-award all currently defined badges (idempotent upsert).
  INSERT INTO public.user_badges (user_id, badge_id, earned_at, source_metadata)
  SELECT
    v_user_id,
    bd.id,
    now(),
    jsonb_build_object(
      'seeded', true,
      'seed_key', 'leaderboard_demo_new_department_badges',
      'seeded_at', now()
    )
  FROM public.badge_definitions bd
  ON CONFLICT (user_id, badge_id) DO UPDATE
  SET
    earned_at = EXCLUDED.earned_at,
    source_metadata = EXCLUDED.source_metadata;
END;
$$;
