BEGIN;

CREATE TABLE public.monthly_self_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  month_key text NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
  full_name text NOT NULL,
  department_role text NOT NULL,
  top_three_things_worked_on text NOT NULL,
  biggest_impact text NOT NULL,
  impact_reason text NOT NULL,
  significant_achievement text NOT NULL,
  challenge_resolved text NOT NULL,
  monthly_improvement text NOT NULL,
  work_slowdown text NOT NULL,
  unseen_workflow_issue text NOT NULL,
  requested_support text NOT NULL,
  productivity_score smallint NOT NULL CHECK (productivity_score BETWEEN 1 AND 10),
  productivity_reason text NOT NULL,
  ownership_outside_role text NOT NULL,
  professional_improvement_area text NOT NULL,
  next_skill_to_learn text NOT NULL,
  leadership_did_well text NOT NULL,
  leadership_can_improve text NOT NULL,
  contributions_visible text NOT NULL CHECK (contributions_visible IN ('yes', 'sometimes', 'no')),
  comfortable_raising_concerns text NOT NULL CHECK (comfortable_raising_concerns IN ('yes', 'sometimes', 'no')),
  hidden_productivity_issue text NOT NULL,
  immediate_improvement text NOT NULL,
  additional_comments text,
  next_month_goal text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (user_id, month_key)
);

CREATE INDEX idx_monthly_self_evaluations_month_key
  ON public.monthly_self_evaluations(month_key);

CREATE INDEX idx_monthly_self_evaluations_department_role
  ON public.monthly_self_evaluations(department_role);

CREATE INDEX idx_monthly_self_evaluations_submitted_at
  ON public.monthly_self_evaluations(submitted_at DESC);

ALTER TABLE public.monthly_self_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_self_evaluations FORCE ROW LEVEL SECURITY;

CREATE POLICY monthly_self_evaluations_select_policy ON public.monthly_self_evaluations
  FOR SELECT
  TO authenticated
  USING (
    monthly_self_evaluations.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY monthly_self_evaluations_insert_policy ON public.monthly_self_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    monthly_self_evaluations.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY monthly_self_evaluations_update_policy ON public.monthly_self_evaluations
  FOR UPDATE
  TO authenticated
  USING (
    monthly_self_evaluations.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    monthly_self_evaluations.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY monthly_self_evaluations_delete_policy ON public.monthly_self_evaluations
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

COMMENT ON TABLE public.monthly_self_evaluations IS
  'Monthly self-evaluation submissions for staff, interns, and leadership.';

COMMIT;