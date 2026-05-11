-- Gamification: points ledger, denormalized totals, leaderboard snapshots.

-- 1. Points ledger
CREATE TABLE IF NOT EXISTS public.points_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'milestone_approved',
    'weekly_complete',
    'milestone_overdue'
  )),
  points integer NOT NULL,
  source_milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  source_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_events_user_id_idx ON public.points_events(user_id);
CREATE INDEX IF NOT EXISTS points_events_created_at_idx ON public.points_events(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS points_events_milestone_approved_uniq
  ON public.points_events(source_milestone_id)
  WHERE event_type = 'milestone_approved' AND source_milestone_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS points_events_milestone_overdue_uniq
  ON public.points_events(source_milestone_id)
  WHERE event_type = 'milestone_overdue' AND source_milestone_id IS NOT NULL;

-- 2. Denormalized user totals
CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  points_total integer NOT NULL DEFAULT 0,
  current_tier text NOT NULL DEFAULT 'bronze' CHECK (current_tier IN ('bronze','silver','gold','production_ready')),
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Period snapshots (monthly close)
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  ranking jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end, scope)
);

-- 4. Tier helper
CREATE OR REPLACE FUNCTION public.compute_tier(p_points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 400 THEN 'production_ready'
    WHEN p_points >= 150 THEN 'gold'
    WHEN p_points >= 50  THEN 'silver'
    ELSE 'bronze'
  END;
$$;

-- 5. Streak recompute (consecutive ISO weeks with >=1 approved milestone)
CREATE OR REPLACE FUNCTION public.recompute_user_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_streak integer := 0;
  v_cursor date;
  v_has_event boolean;
BEGIN
  v_cursor := date_trunc('week', now())::date;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.points_events
      WHERE user_id = p_user_id
        AND event_type = 'milestone_approved'
        AND created_at >= v_cursor
        AND created_at < v_cursor + INTERVAL '7 days'
    ) INTO v_has_event;
    IF NOT v_has_event THEN EXIT; END IF;
    v_streak := v_streak + 1;
    v_cursor := v_cursor - INTERVAL '7 days';
  END LOOP;
  RETURN v_streak;
END;
$$;

-- 6. Recompute denormalized row from ledger
CREATE OR REPLACE FUNCTION public.recompute_user_gamification(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
  v_streak integer;
  v_last timestamptz;
  v_tier text;
  v_longest integer;
BEGIN
  SELECT COALESCE(SUM(points), 0), MAX(created_at)
    INTO v_total, v_last
    FROM public.points_events
    WHERE user_id = p_user_id;

  v_tier := public.compute_tier(v_total);
  v_streak := public.recompute_user_streak(p_user_id);

  SELECT GREATEST(COALESCE(longest_streak, 0), v_streak)
    INTO v_longest
    FROM public.user_gamification
    WHERE user_id = p_user_id;
  v_longest := COALESCE(v_longest, v_streak);

  INSERT INTO public.user_gamification (user_id, points_total, current_tier, current_streak, longest_streak, last_activity_at, updated_at)
  VALUES (p_user_id, v_total, v_tier, v_streak, v_longest, v_last, now())
  ON CONFLICT (user_id) DO UPDATE
    SET points_total = EXCLUDED.points_total,
        current_tier = EXCLUDED.current_tier,
        current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(public.user_gamification.longest_streak, EXCLUDED.current_streak),
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = now();
END;
$$;

-- 7. Trigger: when a milestone moves to 'approved', credit the lead user.
CREATE OR REPLACE FUNCTION public.handle_milestone_approval_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead uuid;
  v_points integer;
  v_event_type text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT lead_user_id INTO v_lead FROM public.projects WHERE id = NEW.project_id;
    IF v_lead IS NULL THEN RETURN NEW; END IF;

    IF NEW.period_type = 'week' THEN
      v_points := 5;
      v_event_type := 'weekly_complete';
    ELSE
      v_points := 10;
      v_event_type := 'milestone_approved';
    END IF;

    INSERT INTO public.points_events (user_id, event_type, points, source_milestone_id, source_project_id)
    VALUES (v_lead, v_event_type, v_points, NEW.id, NEW.project_id)
    ON CONFLICT DO NOTHING;

    PERFORM public.recompute_user_gamification(v_lead);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS milestone_approval_points_trg ON public.project_milestones;
CREATE TRIGGER milestone_approval_points_trg
AFTER UPDATE OF status ON public.project_milestones
FOR EACH ROW
EXECUTE FUNCTION public.handle_milestone_approval_points();

-- 8. RLS
ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification FORCE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots FORCE ROW LEVEL SECURITY;

-- Everyone authenticated can read leaderboard rows
CREATE POLICY user_gamification_read_all ON public.user_gamification
  FOR SELECT TO authenticated USING (true);

CREATE POLICY points_events_read_self ON public.points_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

CREATE POLICY leaderboard_snapshots_read_all ON public.leaderboard_snapshots
  FOR SELECT TO authenticated USING (true);

-- Admin write
CREATE POLICY points_events_admin_write ON public.points_events
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));

CREATE POLICY user_gamification_admin_write ON public.user_gamification
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));

CREATE POLICY leaderboard_snapshots_admin_write ON public.leaderboard_snapshots
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[]));
