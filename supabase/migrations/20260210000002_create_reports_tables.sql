-- Migration: Create Reports Tables
-- Created: 2026-02-10
-- Description: Creates reports and report_metrics tables with RLS policies

BEGIN;

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  report_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.report_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_employee_id ON public.reports(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_status ON public.reports(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_period_start ON public.reports(period_start);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_deleted_at ON public.reports(deleted_at);

CREATE INDEX idx_report_metrics_report_id ON public.report_metrics(report_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics FORCE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = reports.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

CREATE POLICY "reports_select_reports_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = reports.employee_id
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

CREATE POLICY "reports_select_admin_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

CREATE POLICY "reports_insert_policy" ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "reports_update_policy" ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "reports_delete_policy" ON public.reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "report_metrics_select_policy" ON public.report_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.immediate_head = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "report_metrics_insert_policy" ON public.report_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "report_metrics_update_policy" ON public.report_metrics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "report_metrics_delete_policy" ON public.report_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      JOIN public.users ON users.id = auth.uid()
      WHERE reports.id = report_metrics.report_id
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.reports IS 'Employee weekly/monthly/marketing reports';
COMMENT ON TABLE public.report_metrics IS 'Structured metrics attached to reports';
COMMENT ON COLUMN public.reports.deleted_at IS 'Soft delete timestamp';

COMMIT;
