BEGIN;

DO $$
BEGIN
  IF to_regclass('public.monthly_call_feedback') IS NULL THEN
    CREATE TABLE public.monthly_call_feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
      month_key text NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
      full_name text NOT NULL,
      department_role text NOT NULL,
      engagement_level smallint NOT NULL CHECK (engagement_level BETWEEN 1 AND 4),
      engagement_reason text NOT NULL,
      valuable_parts text[] NOT NULL,
      valuable_parts_reason text NOT NULL,
      call_length text NOT NULL CHECK (call_length IN ('too_long', 'just_right', 'too_short')),
      clarity_financial_growth_discussion text NOT NULL CHECK (clarity_financial_growth_discussion IN ('very_clear', 'clear', 'neutral', 'not_clear')),
      clarity_icebreaker_conversation_starters text NOT NULL CHECK (clarity_icebreaker_conversation_starters IN ('very_clear', 'clear', 'neutral', 'not_clear')),
      clarity_five_percent_reflection_worksheet text NOT NULL CHECK (clarity_five_percent_reflection_worksheet IN ('very_clear', 'clear', 'neutral', 'not_clear')),
      overall_rating smallint NOT NULL CHECK (overall_rating BETWEEN 1 AND 4),
      key_takeaway text NOT NULL,
      future_improvements text NOT NULL,
      next_topics text NOT NULL,
      submitted_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES auth.users(id),
      deleted_at timestamptz,
      UNIQUE (user_id, month_key)
    );

    CREATE INDEX idx_monthly_call_feedback_month_key
      ON public.monthly_call_feedback(month_key);

    CREATE INDEX idx_monthly_call_feedback_department_role
      ON public.monthly_call_feedback(department_role);

    CREATE INDEX idx_monthly_call_feedback_submitted_at
      ON public.monthly_call_feedback(submitted_at DESC);

    ALTER TABLE public.monthly_call_feedback ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.monthly_call_feedback FORCE ROW LEVEL SECURITY;

    CREATE POLICY monthly_call_feedback_select_policy ON public.monthly_call_feedback
      FOR SELECT
      TO authenticated
      USING (
        monthly_call_feedback.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
      );

    CREATE POLICY monthly_call_feedback_insert_policy ON public.monthly_call_feedback
      FOR INSERT
      TO authenticated
      WITH CHECK (
        monthly_call_feedback.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
      );

    CREATE POLICY monthly_call_feedback_update_policy ON public.monthly_call_feedback
      FOR UPDATE
      TO authenticated
      USING (
        monthly_call_feedback.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
      )
      WITH CHECK (
        monthly_call_feedback.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
      );

    CREATE POLICY monthly_call_feedback_delete_policy ON public.monthly_call_feedback
      FOR DELETE
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
      );

    COMMENT ON TABLE public.monthly_call_feedback IS
      'Monthly call feedback submissions for employees, interns, admins, and super admins.';
  END IF;
END
$$;

COMMIT;