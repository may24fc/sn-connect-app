-- Seed demo leaderboard state for associate@example.com
-- Goal:
-- 1) Show all possible badges in UI
-- 2) Set minimum top-league threshold points (4000)
-- 3) Set highest league (production_ready)

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT u.id
    INTO v_user_id
    FROM auth.users au
    JOIN public.users u ON u.id = au.id
   WHERE lower(au.email) = 'associate@example.com'
     AND u.deleted_at IS NULL
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Seed skipped: user associate@example.com not found';
    RETURN;
  END IF;

  -- Ensure the account owns every badge currently defined.
  INSERT INTO public.user_badges (user_id, badge_id, earned_at, source_metadata)
  SELECT
    v_user_id,
    bd.id,
    now(),
    jsonb_build_object(
      'seeded', true,
      'seed_key', 'leaderboard_demo_all_badges',
      'seeded_at', now()
    )
  FROM public.badge_definitions bd
  ON CONFLICT (user_id, badge_id) DO UPDATE
  SET
    earned_at = EXCLUDED.earned_at,
    source_metadata = EXCLUDED.source_metadata;

  -- Force minimum threshold for highest league.
  -- 4000 is the floor for production_ready.
  INSERT INTO public.user_gamification (
    user_id,
    points_total,
    current_tier,
    current_streak,
    longest_streak,
    last_activity_at,
    updated_at
  )
  VALUES (
    v_user_id,
    4000,
    'production_ready',
    4,
    4,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    points_total = 4000,
    current_tier = 'production_ready',
    current_streak = GREATEST(public.user_gamification.current_streak, 4),
    longest_streak = GREATEST(public.user_gamification.longest_streak, 4),
    last_activity_at = now(),
    updated_at = now();
END;
$$;
