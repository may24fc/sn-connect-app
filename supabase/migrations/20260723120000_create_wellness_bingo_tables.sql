BEGIN;

CREATE TABLE public.wellness_bingo_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT wellness_bingo_cycles_date_check CHECK (end_date >= start_date),
  CONSTRAINT wellness_bingo_cycles_window_unique UNIQUE (start_date, end_date)
);

CREATE TABLE public.wellness_bingo_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.wellness_bingo_cycles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  custom_habit_text text,
  tile_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT wellness_bingo_boards_user_cycle_unique UNIQUE (cycle_id, user_id),
  CONSTRAINT wellness_bingo_boards_custom_habit_length CHECK (
    custom_habit_text IS NULL OR char_length(trim(custom_habit_text)) BETWEEN 1 AND 80
  )
);

CREATE TABLE public.wellness_bingo_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.wellness_bingo_cycles(id) ON DELETE CASCADE,
  user_a_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT wellness_bingo_partnerships_distinct_users CHECK (user_a_id <> user_b_id)
);

CREATE INDEX idx_wellness_bingo_cycles_active_dates
  ON public.wellness_bingo_cycles(is_active, start_date DESC, end_date DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_wellness_bingo_cycles_single_active
  ON public.wellness_bingo_cycles(is_active)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX idx_wellness_bingo_boards_cycle_user
  ON public.wellness_bingo_boards(cycle_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_wellness_bingo_boards_user
  ON public.wellness_bingo_boards(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_wellness_bingo_partnerships_cycle_users
  ON public.wellness_bingo_partnerships(cycle_id, user_a_id, user_b_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_wellness_bingo_partnerships_pair_unique
  ON public.wellness_bingo_partnerships(
    cycle_id,
    LEAST(user_a_id::text, user_b_id::text),
    GREATEST(user_a_id::text, user_b_id::text)
  )
  WHERE deleted_at IS NULL;

ALTER TABLE public.wellness_bingo_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_bingo_cycles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.wellness_bingo_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_bingo_boards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.wellness_bingo_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_bingo_partnerships FORCE ROW LEVEL SECURITY;

CREATE POLICY wellness_bingo_cycles_select_policy ON public.wellness_bingo_cycles
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY wellness_bingo_cycles_admin_write_policy ON public.wellness_bingo_cycles
  FOR ALL
  TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY wellness_bingo_boards_select_policy ON public.wellness_bingo_boards
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    )
  );

CREATE POLICY wellness_bingo_boards_insert_policy ON public.wellness_bingo_boards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY wellness_bingo_boards_update_policy ON public.wellness_bingo_boards
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY wellness_bingo_boards_delete_policy ON public.wellness_bingo_boards
  FOR DELETE
  TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY wellness_bingo_partnerships_select_policy ON public.wellness_bingo_partnerships
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth.uid() IN (user_a_id, user_b_id)
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    )
  );

CREATE POLICY wellness_bingo_partnerships_insert_policy ON public.wellness_bingo_partnerships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (user_a_id, user_b_id)
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY wellness_bingo_partnerships_update_policy ON public.wellness_bingo_partnerships
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth.uid() IN (user_a_id, user_b_id)
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    auth.uid() IN (user_a_id, user_b_id)
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY wellness_bingo_partnerships_delete_policy ON public.wellness_bingo_partnerships
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (user_a_id, user_b_id)
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

DROP TRIGGER IF EXISTS trigger_wellness_bingo_cycles_updated_at ON public.wellness_bingo_cycles;
CREATE TRIGGER trigger_wellness_bingo_cycles_updated_at
  BEFORE UPDATE ON public.wellness_bingo_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_wellness_bingo_boards_updated_at ON public.wellness_bingo_boards;
CREATE TRIGGER trigger_wellness_bingo_boards_updated_at
  BEFORE UPDATE ON public.wellness_bingo_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_wellness_bingo_partnerships_updated_at ON public.wellness_bingo_partnerships;
CREATE TRIGGER trigger_wellness_bingo_partnerships_updated_at
  BEFORE UPDATE ON public.wellness_bingo_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.wellness_bingo_cycles IS
  'Reusable 30-day wellness bingo challenge cycles.';

COMMENT ON TABLE public.wellness_bingo_boards IS
  'Per-user persisted bingo progress and custom habit text for a wellness cycle.';

COMMENT ON TABLE public.wellness_bingo_partnerships IS
  'Two-user wellness bingo pairings used for combined score calculations.';

INSERT INTO public.wellness_bingo_cycles (
  title,
  description,
  start_date,
  end_date,
  is_active
) VALUES (
  '30-Day Team Wellness Bingo',
  'Win by building consistent habits, not just ticking boxes. A perfect week = a bingo.',
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date)::date + interval '29 days')::date,
  true
)
ON CONFLICT (start_date, end_date) DO NOTHING;

COMMIT;