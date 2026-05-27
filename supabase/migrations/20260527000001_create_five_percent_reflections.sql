BEGIN;

CREATE TABLE public.five_percent_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  month_key text NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
  full_name text NOT NULL,
  department_role text NOT NULL,
  work_feelings text NOT NULL,
  work_headline text NOT NULL,
  work_significance text NOT NULL,
  work_rank smallint NOT NULL CHECK (work_rank BETWEEN 1 AND 10),
  work_action text NOT NULL,
  family_feelings text NOT NULL,
  family_headline text NOT NULL,
  family_significance text NOT NULL,
  family_rank smallint NOT NULL CHECK (family_rank BETWEEN 1 AND 10),
  family_action text NOT NULL,
  personal_feelings text NOT NULL,
  personal_headline text NOT NULL,
  personal_significance text NOT NULL,
  personal_rank smallint NOT NULL CHECK (personal_rank BETWEEN 1 AND 10),
  personal_action text NOT NULL,
  deep_dive_parking_lot text NOT NULL,
  exploration_topics text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (user_id, month_key)
);

CREATE INDEX idx_five_percent_reflections_month_key
  ON public.five_percent_reflections(month_key);

CREATE INDEX idx_five_percent_reflections_department_role
  ON public.five_percent_reflections(department_role);

CREATE INDEX idx_five_percent_reflections_submitted_at
  ON public.five_percent_reflections(submitted_at DESC);

ALTER TABLE public.five_percent_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.five_percent_reflections FORCE ROW LEVEL SECURITY;

CREATE POLICY five_percent_reflections_select_policy ON public.five_percent_reflections
  FOR SELECT
  TO authenticated
  USING (
    five_percent_reflections.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY five_percent_reflections_insert_policy ON public.five_percent_reflections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    five_percent_reflections.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY five_percent_reflections_update_policy ON public.five_percent_reflections
  FOR UPDATE
  TO authenticated
  USING (
    five_percent_reflections.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    five_percent_reflections.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY five_percent_reflections_delete_policy ON public.five_percent_reflections
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

COMMENT ON TABLE public.five_percent_reflections IS
  'Monthly 5% reflection submissions covering work, family, personal, and deeper reflection topics.';

COMMIT;