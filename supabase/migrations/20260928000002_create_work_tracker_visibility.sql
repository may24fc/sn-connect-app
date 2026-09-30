-- Unified Work Tracker: task/project links, a real blocked state, and privacy-minimized hub usage.

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON public.tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id
  ON public.tasks(milestone_id) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_task_project_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.milestone_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.project_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.project_milestones milestone
    WHERE milestone.id = NEW.milestone_id
      AND milestone.project_id = NEW.project_id
      AND milestone.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Task milestone must belong to the selected project';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_task_project_link ON public.tasks;
CREATE TRIGGER trigger_validate_task_project_link
  BEFORE INSERT OR UPDATE OF project_id, milestone_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_project_link();

CREATE TABLE IF NOT EXISTS public.hub_usage_daily (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  heartbeat_count integer NOT NULL DEFAULT 1 CHECK (heartbeat_count >= 0),
  session_count integer NOT NULL DEFAULT 1 CHECK (session_count >= 0),
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_hub_usage_daily_activity_date
  ON public.hub_usage_daily(activity_date DESC);

CREATE TABLE IF NOT EXISTS public.hub_usage_session_windows (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  activity_date date NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_hub_usage_session_windows_last_seen
  ON public.hub_usage_session_windows(last_seen_at);

ALTER TABLE public.hub_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_usage_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE public.hub_usage_session_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_usage_session_windows FORCE ROW LEVEL SECURITY;

CREATE POLICY "hub_usage_daily_select_own_or_admin" ON public.hub_usage_daily
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('admin', 'super_admin')
        AND viewer.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.record_hub_activity(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_activity_date date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_inserted_sessions integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.hub_usage_session_windows (
    user_id,
    session_id,
    activity_date,
    last_seen_at
  ) VALUES (
    v_user_id,
    p_session_id,
    v_activity_date,
    v_now
  )
  ON CONFLICT (user_id, session_id, activity_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted_sessions = ROW_COUNT;

  UPDATE public.hub_usage_session_windows
  SET last_seen_at = v_now
  WHERE user_id = v_user_id
    AND session_id = p_session_id
    AND activity_date = v_activity_date;

  INSERT INTO public.hub_usage_daily (
    user_id,
    activity_date,
    first_seen_at,
    last_seen_at,
    heartbeat_count,
    session_count
  ) VALUES (
    v_user_id,
    v_activity_date,
    v_now,
    v_now,
    1,
    1
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE
  SET last_seen_at = EXCLUDED.last_seen_at,
      heartbeat_count = public.hub_usage_daily.heartbeat_count + 1,
      session_count = public.hub_usage_daily.session_count +
        CASE WHEN v_inserted_sessions > 0 THEN 1 ELSE 0 END;

  DELETE FROM public.hub_usage_session_windows
  WHERE last_seen_at < v_now - interval '2 days';

  DELETE FROM public.hub_usage_daily
  WHERE activity_date < v_activity_date - 365;
END;
$$;

REVOKE ALL ON FUNCTION public.record_hub_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_hub_activity(uuid) TO authenticated;

COMMENT ON TABLE public.hub_usage_daily IS
  'Privacy-minimized daily Control Hub activity aggregates retained for 12 months.';
COMMENT ON TABLE public.hub_usage_session_windows IS
  'Short-lived session deduplication records; contains no route, IP, or user-agent data.';
