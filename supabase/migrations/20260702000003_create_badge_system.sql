-- Leaderboards v2 Phase 3: Badge / Achievement System
-- Behavioral medals that replace the flat tier-as-medals concept.

-- 1. Badge catalog (static; new badges require a migration)
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  department  text,             -- NULL = earnable by anyone
  icon        text NOT NULL,    -- Lucide icon name
  rarity      text NOT NULL DEFAULT 'uncommon'
                CHECK (rarity IN ('common','uncommon','rare','legendary')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed initial badge catalog
INSERT INTO public.badge_definitions (id, name, description, department, icon, rarity) VALUES
  (
    'first_blood',
    'First Delivery',
    'Completed your very first approved milestone.',
    NULL,
    'Star',
    'common'
  ),
  (
    'clockwork',
    'The Clockwork',
    'Maintained a 4-week consecutive streak without missing a deadline.',
    NULL,
    'Clock',
    'uncommon'
  ),
  (
    'debugger',
    'The Debugger',
    'Had 3 or more complex or epic milestones approved in AI & Automation.',
    'AI & Automation',
    'Bug',
    'rare'
  ),
  (
    'pipeline_architect',
    'Pipeline Architect',
    'Successfully delivered your first epic-tier milestone.',
    NULL,
    'GitBranch',
    'legendary'
  ),
  (
    'growth_catalyst',
    'Growth Catalyst',
    'Drove 5 complex milestones to completion in Marketing.',
    'Marketing',
    'TrendingUp',
    'rare'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. User badges (earned; one per person per badge type)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id        text NOT NULL REFERENCES public.badge_definitions(id),
  earned_at       timestamptz NOT NULL DEFAULT now(),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges(user_id);

-- 4. check_and_award_badges: called after every gamification recompute
--    Idempotent: ON CONFLICT DO NOTHING prevents duplicates.
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_approved_count        integer;
  v_streak                integer;
  v_complex_ai_count      integer;
  v_epic_count            integer;
  v_complex_mktg_count    integer;
BEGIN
  -- ── first_blood: at least 1 approved milestone ────────────────────────────
  SELECT COUNT(*)::integer INTO v_approved_count
  FROM public.points_events
  WHERE user_id    = p_user_id
    AND event_type IN ('milestone_approved', 'weekly_complete');

  IF v_approved_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'first_blood', jsonb_build_object('approved_count', v_approved_count))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- ── clockwork: current_streak >= 4 ────────────────────────────────────────
  SELECT current_streak INTO v_streak
  FROM public.user_gamification
  WHERE user_id = p_user_id;

  IF COALESCE(v_streak, 0) >= 4 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'clockwork', jsonb_build_object('streak', v_streak))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- ── debugger: 3+ complex/epic milestones in AI & Automation ───────────────
  SELECT COUNT(*)::integer INTO v_complex_ai_count
  FROM public.points_events pe
  JOIN public.project_milestones pm ON pm.id = pe.source_milestone_id
  WHERE pe.user_id               = p_user_id
    AND pe.milestone_department  = 'AI & Automation'
    AND pm.complexity_tier       IN ('complex', 'epic');

  IF v_complex_ai_count >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'debugger', jsonb_build_object('complex_count', v_complex_ai_count))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- ── pipeline_architect: first epic-tier milestone (any department) ─────────
  SELECT COUNT(*)::integer INTO v_epic_count
  FROM public.points_events pe
  JOIN public.project_milestones pm ON pm.id = pe.source_milestone_id
  WHERE pe.user_id         = p_user_id
    AND pm.complexity_tier = 'epic';

  IF v_epic_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'pipeline_architect', jsonb_build_object('epic_count', v_epic_count))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- ── growth_catalyst: 5+ complex milestones in Marketing ───────────────────
  SELECT COUNT(*)::integer INTO v_complex_mktg_count
  FROM public.points_events pe
  JOIN public.project_milestones pm ON pm.id = pe.source_milestone_id
  WHERE pe.user_id               = p_user_id
    AND pe.milestone_department  = 'Marketing'
    AND pm.complexity_tier       = 'complex';

  IF v_complex_mktg_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'growth_catalyst', jsonb_build_object('complex_marketing_count', v_complex_mktg_count))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$;

-- 5. Final update of recompute_user_gamification: adds badge check at the end
CREATE OR REPLACE FUNCTION public.recompute_user_gamification(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total   integer;
  v_streak  integer;
  v_last    timestamptz;
  v_tier    text;
  v_longest integer;
BEGIN
  SELECT COALESCE(SUM(points), 0), MAX(created_at)
    INTO v_total, v_last
    FROM public.points_events
    WHERE user_id = p_user_id;

  v_tier   := public.compute_tier(v_total);
  v_streak := public.recompute_user_streak(p_user_id);

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
    SET points_total     = EXCLUDED.points_total,
        current_tier     = EXCLUDED.current_tier,
        current_streak   = EXCLUDED.current_streak,
        longest_streak   = GREATEST(public.user_gamification.longest_streak, EXCLUDED.current_streak),
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at       = now();

  -- Domain mastery dual-ledger
  PERFORM public.recompute_user_domain_mastery(p_user_id);

  -- Badge / achievement check (idempotent)
  PERFORM public.check_and_award_badges(p_user_id);
END;
$$;

-- 6. RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges FORCE ROW LEVEL SECURITY;

-- Badge catalog: any authenticated user can read
CREATE POLICY badge_definitions_read_all ON public.badge_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY badge_definitions_admin_write ON public.badge_definitions
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));

-- User badges: read own + admin can read all
CREATE POLICY user_badges_read ON public.user_badges
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

CREATE POLICY user_badges_admin_write ON public.user_badges
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));

-- 7. Retroactive backfill: award eligible badges to all existing users
DO $$
DECLARE
  v_uid uuid;
BEGIN
  FOR v_uid IN
    SELECT DISTINCT user_id
    FROM public.points_events
    WHERE event_type IN ('milestone_approved', 'weekly_complete')
  LOOP
    PERFORM public.check_and_award_badges(v_uid);
  END LOOP;
END;
$$;
