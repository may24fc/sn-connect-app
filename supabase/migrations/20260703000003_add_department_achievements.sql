-- Add department-specific achievements and extend badge-award logic.
-- This gives each mastery domain a dedicated achievement path.

-- 1) Extend badge catalog with department mastery achievements
INSERT INTO public.badge_definitions (id, name, description, department, icon, rarity) VALUES
  (
    'ai_orchestrator',
    'AI Orchestrator',
    'Reached mastery level 5 in AI & Automation.',
    'AI & Automation',
    'Cpu',
    'rare'
  ),
  (
    'market_strategist',
    'Market Strategist',
    'Reached mastery level 5 in Marketing.',
    'Marketing',
    'TrendingUp',
    'rare'
  ),
  (
    'talent_guardian',
    'Talent Guardian',
    'Reached mastery level 5 in HR.',
    'HR',
    'Shield',
    'rare'
  ),
  (
    'design_virtuoso',
    'Design Virtuoso',
    'Reached mastery level 5 in Design.',
    'Design',
    'Palette',
    'rare'
  ),
  (
    'illustration_prodigy',
    'Illustration Prodigy',
    'Reached mastery level 5 in Graphic Design.',
    'Graphic Design',
    'PenTool',
    'rare'
  ),
  (
    'video_storycrafter',
    'Video Storycrafter',
    'Reached mastery level 5 in Video.',
    'Video',
    'Film',
    'rare'
  ),
  (
    'ledger_sentinel',
    'Ledger Sentinel',
    'Reached mastery level 5 in Accounting.',
    'Accounting',
    'Calculator',
    'rare'
  )
ON CONFLICT (id) DO NOTHING;

-- 2) Extend badge check function with mastery-based department achievements
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

  v_ai_mastery            integer;
  v_marketing_mastery     integer;
  v_hr_mastery            integer;
  v_design_mastery        integer;
  v_graphic_mastery       integer;
  v_video_mastery         integer;
  v_accounting_mastery    integer;
BEGIN
  -- first_blood: at least 1 approved milestone
  SELECT COUNT(*)::integer INTO v_approved_count
  FROM public.points_events
  WHERE user_id    = p_user_id
    AND event_type IN ('milestone_approved', 'weekly_complete');

  IF v_approved_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'first_blood', jsonb_build_object('approved_count', v_approved_count))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- clockwork: current_streak >= 4
  SELECT current_streak INTO v_streak
  FROM public.user_gamification
  WHERE user_id = p_user_id;

  IF COALESCE(v_streak, 0) >= 4 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'clockwork', jsonb_build_object('streak', v_streak))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- debugger: 3+ complex/epic milestones in AI & Automation
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

  -- pipeline_architect: first epic-tier milestone (any department)
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

  -- growth_catalyst: 5+ complex milestones in Marketing
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

  -- Department mastery achievements (level 5+)
  SELECT mastery_level INTO v_ai_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'AI & Automation';

  IF COALESCE(v_ai_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'ai_orchestrator', jsonb_build_object('mastery_level', v_ai_mastery, 'department', 'AI & Automation'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_marketing_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'Marketing';

  IF COALESCE(v_marketing_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'market_strategist', jsonb_build_object('mastery_level', v_marketing_mastery, 'department', 'Marketing'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_hr_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'HR';

  IF COALESCE(v_hr_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'talent_guardian', jsonb_build_object('mastery_level', v_hr_mastery, 'department', 'HR'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_design_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'Design';

  IF COALESCE(v_design_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'design_virtuoso', jsonb_build_object('mastery_level', v_design_mastery, 'department', 'Design'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_graphic_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'Graphic Design';

  IF COALESCE(v_graphic_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'illustration_prodigy', jsonb_build_object('mastery_level', v_graphic_mastery, 'department', 'Graphic Design'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_video_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'Video';

  IF COALESCE(v_video_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'video_storycrafter', jsonb_build_object('mastery_level', v_video_mastery, 'department', 'Video'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  SELECT mastery_level INTO v_accounting_mastery
  FROM public.user_domain_mastery
  WHERE user_id = p_user_id AND department = 'Accounting';

  IF COALESCE(v_accounting_mastery, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source_metadata)
    VALUES (p_user_id, 'ledger_sentinel', jsonb_build_object('mastery_level', v_accounting_mastery, 'department', 'Accounting'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$;

-- 3) Backfill new mastery achievements for existing users
DO $$
DECLARE
  v_uid uuid;
BEGIN
  FOR v_uid IN
    SELECT DISTINCT user_id
    FROM public.user_domain_mastery
  LOOP
    PERFORM public.check_and_award_badges(v_uid);
  END LOOP;
END;
$$;
