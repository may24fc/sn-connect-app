BEGIN;

CREATE TABLE public.performance_evaluation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_kind text NOT NULL CHECK (
    evaluation_kind IN ('monthly', 'quarterly', 'five_percent', 'monthly_call_feedback')
  ),
  period_key text NOT NULL CHECK (
    period_key ~ '^\d{4}-\d{2}$'
    OR period_key ~ '^\d{4}-Q[1-4]$'
  ),
  summary_markdown text NOT NULL,
  total_submissions_analyzed integer NOT NULL CHECK (total_submissions_analyzed >= 0),
  sentiment_distribution jsonb,
  source_snapshot_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (evaluation_kind, period_key)
);

CREATE INDEX idx_performance_evaluation_summaries_generated_at
  ON public.performance_evaluation_summaries(generated_at DESC);

CREATE INDEX idx_performance_evaluation_summaries_lookup
  ON public.performance_evaluation_summaries(evaluation_kind, period_key)
  WHERE deleted_at IS NULL;

ALTER TABLE public.performance_evaluation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_evaluation_summaries FORCE ROW LEVEL SECURITY;

CREATE POLICY performance_evaluation_summaries_select_policy ON public.performance_evaluation_summaries
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_evaluation_summaries_insert_policy ON public.performance_evaluation_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_evaluation_summaries_update_policy ON public.performance_evaluation_summaries
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_evaluation_summaries_delete_policy ON public.performance_evaluation_summaries
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

COMMENT ON TABLE public.performance_evaluation_summaries IS
  'Persisted executive summaries for aggregate performance evaluation submissions by form type and period.';

COMMIT;