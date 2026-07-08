-- Leaderboards v2 Phase 2: Domain Mastery Dual-Ledger
-- Per-department mastery points with 7-level progression.

-- 1. user_domain_mastery table
CREATE TABLE IF NOT EXISTS public.user_domain_mastery (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  department text NOT NULL,
  mastery_points integer NOT NULL DEFAULT 0,
  mastery_level  integer NOT NULL DEFAULT 1,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department),
  CONSTRAINT mastery_level_valid CHECK (mastery_level BETWEEN 1 AND 7)
);

CREATE INDEX IF NOT EXISTS user_domain_mastery_user_idx
  ON public.user_domain_mastery(user_id);

-- 2. compute_mastery_level(points) → 1..7
--    Breakpoints designed for a typical internship lifespan:
--    L1 0–149 / L2 150–449 / L3 450–899 / L4 900–1499
--    L5 1500–2399 / L6 2400–3599 / L7 3600+
CREATE OR REPLACE FUNCTION public.compute_mastery_level(p_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 3600 THEN 7
    WHEN p_points >= 2400 THEN 6
    WHEN p_points >= 1500 THEN 5
    WHEN p_points >= 900  THEN 4
    WHEN p_points >= 450  THEN 3
    WHEN p_points >= 150  THEN 2
    ELSE 1
  END;
$$;

-- 3. recompute_user_domain_mastery: aggregates points_events by milestone_department
CREATE OR REPLACE FUNCTION public.recompute_user_domain_mastery(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT
      milestone_department AS dept,
      COALESCE(SUM(points), 0)::integer AS total_pts
    FROM public.points_events
    WHERE user_id = p_user_id
      AND milestone_department IS NOT NULL
      AND milestone_department <> ''
    GROUP BY milestone_department
  LOOP
    INSERT INTO public.user_domain_mastery
      (user_id, department, mastery_points, mastery_level, updated_at)
    VALUES (
      p_user_id,
      v_record.dept,
      v_record.total_pts,
      public.compute_mastery_level(v_record.total_pts),
      now()
    )
    ON CONFLICT (user_id, department) DO UPDATE
      SET mastery_points = EXCLUDED.mastery_points,
          mastery_level  = EXCLUDED.mastery_level,
          updated_at     = now();
  END LOOP;
END;
$$;

-- 4. Update recompute_user_gamification to also recompute domain mastery
--    (Badge check will be added in migration 3 after check_and_award_badges is defined)
CREATE OR REPLACE FUNCTION public.recompute_user_gamification(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total  integer;
  v_streak integer;
  v_last   timestamptz;
  v_tier   text;
  v_longest integer;
BEGIN
  SELECT COALESCE(SUM(points), 0), MAX(created_at)
    INTO v_total, v_last
    FROM public.points_events
    WHERE user_id = p_user_id;

  v_tier    := public.compute_tier(v_total);
  v_streak  := public.recompute_user_streak(p_user_id);

  SELECT GREATEST(COALESCE(longest_streak, 0), v_streak)
    INTO v_longest
    FROM public.user_gamification
    WHERE user_id = p_user_id;
  v_longest := COALESCE(v_longest, v_streak);

  INSERT INTO public.user_gamification
    (user_id, points_total, current_tier, current_streak, longest_streak, last_activity_at, updated_at)
  VALUES
    (p_user_id, v_total, v_tier, v_streak, v_longest, v_last, now())
  ON CONFLICT (user_id) DO UPDATE
    SET points_total      = EXCLUDED.points_total,
        current_tier      = EXCLUDED.current_tier,
        current_streak    = EXCLUDED.current_streak,
        longest_streak    = GREATEST(public.user_gamification.longest_streak, EXCLUDED.current_streak),
        last_activity_at  = EXCLUDED.last_activity_at,
        updated_at        = now();

  -- Sync domain mastery
  PERFORM public.recompute_user_domain_mastery(p_user_id);
END;
$$;

-- 5. RLS
ALTER TABLE public.user_domain_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_domain_mastery FORCE ROW LEVEL SECURITY;

-- Users read their own; admins can read all
CREATE POLICY user_domain_mastery_read ON public.user_domain_mastery
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

-- Only service-role / admin can write (domain mastery is managed by functions only)
CREATE POLICY user_domain_mastery_admin_write ON public.user_domain_mastery
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));
