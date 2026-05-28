BEGIN;

CREATE TABLE public.performance_evaluation_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  evaluation_kind text NOT NULL CHECK (evaluation_kind IN ('monthly', 'quarterly', 'five_percent')),
  cycle_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, evaluation_kind, cycle_key)
);

CREATE INDEX idx_performance_evaluation_drafts_user_kind_cycle
  ON public.performance_evaluation_drafts(user_id, evaluation_kind, cycle_key);

CREATE INDEX idx_performance_evaluation_drafts_updated_at
  ON public.performance_evaluation_drafts(updated_at DESC);

ALTER TABLE public.performance_evaluation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_evaluation_drafts FORCE ROW LEVEL SECURITY;

CREATE POLICY performance_evaluation_drafts_select_policy ON public.performance_evaluation_drafts
  FOR SELECT
  TO authenticated
  USING (
    performance_evaluation_drafts.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY performance_evaluation_drafts_insert_policy ON public.performance_evaluation_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performance_evaluation_drafts.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY performance_evaluation_drafts_update_policy ON public.performance_evaluation_drafts
  FOR UPDATE
  TO authenticated
  USING (
    performance_evaluation_drafts.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    performance_evaluation_drafts.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY performance_evaluation_drafts_delete_policy ON public.performance_evaluation_drafts
  FOR DELETE
  TO authenticated
  USING (
    performance_evaluation_drafts.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

COMMENT ON TABLE public.performance_evaluation_drafts IS
  'Autosaved server-side drafts for monthly, quarterly, and 5% self-evaluation forms.';

COMMIT;