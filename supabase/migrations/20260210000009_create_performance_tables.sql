-- Migration: Create performance management tables
-- Created: 2026-02-16
-- Description: Adds review cycles, performance reviews, OKRs, and KPIs with RLS policies

BEGIN;

CREATE TYPE review_cycle_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE review_status AS ENUM ('pending', 'self_review', 'manager_review', 'completed');

CREATE TABLE public.review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  self_review_deadline date,
  manager_review_deadline date,
  status review_cycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.review_cycles(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  reviewer_id uuid REFERENCES public.users(id),
  status review_status NOT NULL DEFAULT 'pending',
  self_rating integer CHECK (self_rating >= 1 AND self_rating <= 5),
  self_comments text,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 5),
  manager_comments text,
  final_rating integer CHECK (final_rating >= 1 AND final_rating <= 5),
  goals_for_next_period text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

CREATE TABLE public.okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  cycle_id uuid REFERENCES public.review_cycles(id),
  objective text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]',
  progress numeric(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  cycle_id uuid REFERENCES public.review_cycles(id),
  name text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_cycles_status ON public.review_cycles(status);
CREATE INDEX idx_review_cycles_start_date ON public.review_cycles(start_date);

CREATE INDEX idx_performance_reviews_cycle_id ON public.performance_reviews(cycle_id);
CREATE INDEX idx_performance_reviews_employee_id ON public.performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer_id ON public.performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_status ON public.performance_reviews(status);

CREATE INDEX idx_okrs_employee_id ON public.okrs(employee_id);
CREATE INDEX idx_okrs_cycle_id ON public.okrs(cycle_id);
CREATE INDEX idx_okrs_status ON public.okrs(status);

CREATE INDEX idx_kpis_employee_id ON public.kpis(employee_id);
CREATE INDEX idx_kpis_cycle_id ON public.kpis(cycle_id);
CREATE INDEX idx_kpis_period_start ON public.kpis(period_start);
CREATE INDEX idx_kpis_period_end ON public.kpis(period_end);

ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cycles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okrs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis FORCE ROW LEVEL SECURITY;

CREATE POLICY review_cycles_select_policy ON public.review_cycles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY review_cycles_admin_insert_policy ON public.review_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY review_cycles_admin_update_policy ON public.review_cycles
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY review_cycles_admin_delete_policy ON public.review_cycles
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_reviews_select_policy ON public.performance_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = performance_reviews.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR performance_reviews.reviewer_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY performance_reviews_insert_policy ON public.performance_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
    OR performance_reviews.reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = performance_reviews.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

CREATE POLICY performance_reviews_update_policy ON public.performance_reviews
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
    OR performance_reviews.reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = performance_reviews.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
    OR performance_reviews.reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = performance_reviews.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

CREATE POLICY okrs_select_policy ON public.okrs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY okrs_insert_policy ON public.okrs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY okrs_update_policy ON public.okrs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okrs.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY okrs_delete_policy ON public.okrs
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY kpis_select_policy ON public.kpis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY kpis_insert_policy ON public.kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY kpis_update_policy ON public.kpis
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = kpis.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin'])
  );

CREATE POLICY kpis_delete_policy ON public.kpis
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE TRIGGER trigger_review_cycles_updated_at
  BEFORE UPDATE ON public.review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_okrs_updated_at
  BEFORE UPDATE ON public.okrs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_kpis_updated_at
  BEFORE UPDATE ON public.kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_review_cycles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_performance_reviews_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_okrs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.okrs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_kpis_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.review_cycles IS 'Performance review cycles and key deadlines';
COMMENT ON TABLE public.performance_reviews IS 'Employee performance reviews per cycle';
COMMENT ON TABLE public.okrs IS 'Employee objectives and key results';
COMMENT ON TABLE public.kpis IS 'Employee KPI tracking records';

COMMIT;
