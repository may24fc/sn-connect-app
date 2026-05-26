BEGIN;

CREATE TABLE public.quarterly_temperature_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  quarter_key text NOT NULL CHECK (quarter_key ~ '^\d{4}-Q[1-4]$'),
  full_name text NOT NULL,
  department_role text NOT NULL,
  energy_workload_score smallint NOT NULL CHECK (energy_workload_score BETWEEN 1 AND 10),
  energy_workload_reason text NOT NULL,
  clarity_support text NOT NULL,
  improvement_change text NOT NULL,
  achievement_recognition text NOT NULL,
  feedback_suggestions text NOT NULL,
  overall_experience_score smallint NOT NULL CHECK (overall_experience_score BETWEEN 1 AND 5),
  overall_experience_reason text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (user_id, quarter_key)
);

CREATE INDEX idx_quarterly_temperature_checks_quarter_key
  ON public.quarterly_temperature_checks(quarter_key);

CREATE INDEX idx_quarterly_temperature_checks_department_role
  ON public.quarterly_temperature_checks(department_role);

CREATE INDEX idx_quarterly_temperature_checks_submitted_at
  ON public.quarterly_temperature_checks(submitted_at DESC);

ALTER TABLE public.quarterly_temperature_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_temperature_checks FORCE ROW LEVEL SECURITY;

CREATE POLICY quarterly_temperature_checks_select_policy ON public.quarterly_temperature_checks
  FOR SELECT
  TO authenticated
  USING (
    quarterly_temperature_checks.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY quarterly_temperature_checks_insert_policy ON public.quarterly_temperature_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quarterly_temperature_checks.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY quarterly_temperature_checks_update_policy ON public.quarterly_temperature_checks
  FOR UPDATE
  TO authenticated
  USING (
    quarterly_temperature_checks.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    quarterly_temperature_checks.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY quarterly_temperature_checks_delete_policy ON public.quarterly_temperature_checks
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

COMMENT ON TABLE public.quarterly_temperature_checks IS
  'Quarterly temperature check submissions for staff, interns, and leadership.';

COMMIT;
