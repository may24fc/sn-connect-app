BEGIN;

WITH anchor_window AS (
  SELECT
    (
      DATE '2026-07-27'
      + (
        floor(((current_date - DATE '2026-07-27')::numeric) / 30)
        * 30
      )::int
    )::date AS start_date
), ensured_cycle AS (
  SELECT
    start_date,
    (start_date + INTERVAL '29 days')::date AS end_date
  FROM anchor_window
)
UPDATE public.wellness_bingo_cycles
SET
  is_active = false,
  updated_at = now()
WHERE
  deleted_at IS NULL
  AND is_active = true
  AND (start_date, end_date) <> (
    SELECT start_date, end_date
    FROM ensured_cycle
  );

WITH anchor_window AS (
  SELECT
    (
      DATE '2026-07-27'
      + (
        floor(((current_date - DATE '2026-07-27')::numeric) / 30)
        * 30
      )::int
    )::date AS start_date
), ensured_cycle AS (
  SELECT
    start_date,
    (start_date + INTERVAL '29 days')::date AS end_date
  FROM anchor_window
)
INSERT INTO public.wellness_bingo_cycles (
  title,
  description,
  start_date,
  end_date,
  is_active
)
SELECT
  '30-Day Team Wellness Bingo',
  'Win by building consistent habits, not just ticking boxes. A perfect week = a bingo.',
  start_date,
  end_date,
  true
FROM ensured_cycle
ON CONFLICT (start_date, end_date)
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = true,
  deleted_at = NULL,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.wellness_bingo_weekly_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.wellness_bingo_cycles(id) ON DELETE CASCADE,
  partnership_id uuid NOT NULL REFERENCES public.wellness_bingo_partnerships(id) ON DELETE CASCADE,
  week_index integer NOT NULL CHECK (week_index >= 1),
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  recording_url text NOT NULL CHECK (char_length(trim(recording_url)) BETWEEN 1 AND 2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT wellness_bingo_weekly_recordings_week_date_check CHECK (week_end_date >= week_start_date),
  CONSTRAINT wellness_bingo_weekly_recordings_unique_week UNIQUE (partnership_id, week_index)
);

CREATE INDEX IF NOT EXISTS idx_wellness_bingo_weekly_recordings_cycle_week
  ON public.wellness_bingo_weekly_recordings(cycle_id, week_index DESC, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wellness_bingo_weekly_recordings_partnership
  ON public.wellness_bingo_weekly_recordings(partnership_id, week_index DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wellness_bingo_weekly_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_bingo_weekly_recordings FORCE ROW LEVEL SECURITY;

CREATE POLICY wellness_bingo_weekly_recordings_select_policy ON public.wellness_bingo_weekly_recordings
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
      OR EXISTS (
        SELECT 1
        FROM public.wellness_bingo_partnerships partnership
        WHERE
          partnership.id = partnership_id
          AND partnership.deleted_at IS NULL
          AND auth.uid() IN (partnership.user_a_id, partnership.user_b_id)
      )
    )
  );

CREATE POLICY wellness_bingo_weekly_recordings_insert_policy ON public.wellness_bingo_weekly_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wellness_bingo_partnerships partnership
      WHERE
        partnership.id = partnership_id
        AND partnership.deleted_at IS NULL
        AND auth.uid() IN (partnership.user_a_id, partnership.user_b_id)
    )
  );

CREATE POLICY wellness_bingo_weekly_recordings_update_policy ON public.wellness_bingo_weekly_recordings
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.wellness_bingo_partnerships partnership
      WHERE
        partnership.id = partnership_id
        AND partnership.deleted_at IS NULL
        AND auth.uid() IN (partnership.user_a_id, partnership.user_b_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wellness_bingo_partnerships partnership
      WHERE
        partnership.id = partnership_id
        AND partnership.deleted_at IS NULL
        AND auth.uid() IN (partnership.user_a_id, partnership.user_b_id)
    )
  );

CREATE POLICY wellness_bingo_weekly_recordings_delete_policy ON public.wellness_bingo_weekly_recordings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wellness_bingo_partnerships partnership
      WHERE
        partnership.id = partnership_id
        AND partnership.deleted_at IS NULL
        AND auth.uid() IN (partnership.user_a_id, partnership.user_b_id)
    )
  );

DROP TRIGGER IF EXISTS trigger_wellness_bingo_weekly_recordings_updated_at ON public.wellness_bingo_weekly_recordings;
CREATE TRIGGER trigger_wellness_bingo_weekly_recordings_updated_at
  BEFORE UPDATE ON public.wellness_bingo_weekly_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.wellness_bingo_weekly_recordings IS
  'Weekly partner recording links for each wellness bingo pair, scoped per cycle week.';

COMMIT;
