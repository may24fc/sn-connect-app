-- Migration: 20260216000018_repair_invoices_and_reports_tables.sql
-- Description: Repair missing invoices and reports tables that failed to apply
--   from original migrations 20260210000002 and 20260210000004.
--   Uses IF NOT EXISTS / DO blocks so it is safe to run even if tables already exist.
-- Dependencies: employees, users, auth.users, handle_updated_at(), handle_audit_log()

BEGIN;

-- ============================================
-- 1. Ensure invoice_status enum exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');
  END IF;
END $$;

-- ============================================
-- 2. Create reports table
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
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

-- ============================================
-- 3. Create report_metrics table
-- ============================================

CREATE TABLE IF NOT EXISTS public.report_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. Create invoices table
-- ============================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  deductions numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================
-- 5. Create invoice_line_items table
-- ============================================

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 6. Indexes for reports
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reports_employee_id ON public.reports(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_period_start ON public.reports(period_start);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_deleted_at ON public.reports(deleted_at);
CREATE INDEX IF NOT EXISTS idx_report_metrics_report_id ON public.report_metrics(report_id);

-- ============================================
-- 7. Indexes for invoices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoices_employee_id ON public.invoices(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_period_start ON public.invoices(period_start);
CREATE INDEX IF NOT EXISTS idx_invoices_period_end ON public.invoices(period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- ============================================
-- 8. Enable RLS on all four tables
-- ============================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items FORCE ROW LEVEL SECURITY;

-- ============================================
-- 9. RLS Policies for reports table
-- ============================================

-- Drop first to be idempotent
DROP POLICY IF EXISTS "reports_select_own_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_select_reports_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_select_admin_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON public.reports;

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
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
      AND users.role IN ('admin')
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 10. RLS Policies for report_metrics table
-- ============================================

DROP POLICY IF EXISTS "report_metrics_select_policy" ON public.report_metrics;
DROP POLICY IF EXISTS "report_metrics_insert_policy" ON public.report_metrics;
DROP POLICY IF EXISTS "report_metrics_update_policy" ON public.report_metrics;
DROP POLICY IF EXISTS "report_metrics_delete_policy" ON public.report_metrics;

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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
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
      AND users.role IN ('admin')
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 11. RLS Policies for invoices table
-- ============================================

DROP POLICY IF EXISTS "invoices_select_own_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_reports_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_admin_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_policy" ON public.invoices;

CREATE POLICY "invoices_select_own_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = invoices.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

CREATE POLICY "invoices_select_reports_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = invoices.employee_id
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

CREATE POLICY "invoices_select_admin_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
        AND users.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "invoices_delete_policy" ON public.invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin')
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 12. RLS Policies for invoice_line_items table
-- ============================================

DROP POLICY IF EXISTS "invoice_line_items_select_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select_policy" ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.immediate_head = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "invoice_line_items_insert_policy" ON public.invoice_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "invoice_line_items_update_policy" ON public.invoice_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
          AND users.deleted_at IS NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "invoice_line_items_delete_policy" ON public.invoice_line_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.users ON users.id = auth.uid()
      WHERE invoices.id = invoice_line_items.invoice_id
      AND users.role IN ('admin')
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 13. Triggers for reports table
-- ============================================

-- Drop first to be idempotent
DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
DROP TRIGGER IF EXISTS trigger_reports_audit ON public.reports;

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- 14. Triggers for invoices table
-- ============================================

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS trigger_invoices_audit ON public.invoices;

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_invoices_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- 15. Table comments
-- ============================================

COMMENT ON TABLE public.reports IS 'Employee weekly/monthly/marketing reports';
COMMENT ON TABLE public.report_metrics IS 'Structured metrics attached to reports';
COMMENT ON COLUMN public.reports.deleted_at IS 'Soft delete timestamp';

COMMENT ON TABLE public.invoices IS 'Payroll invoice submissions per employee and pay period';
COMMENT ON TABLE public.invoice_line_items IS 'Detailed invoice line items';
COMMENT ON COLUMN public.invoices.deleted_at IS 'Soft delete timestamp';

-- ============================================
-- 16. Validation (commented out - run manually to verify)
-- ============================================

-- SELECT 'reports' AS table_name, COUNT(*) AS policy_count
--   FROM pg_policies WHERE tablename = 'reports'
-- UNION ALL
-- SELECT 'report_metrics', COUNT(*)
--   FROM pg_policies WHERE tablename = 'report_metrics'
-- UNION ALL
-- SELECT 'invoices', COUNT(*)
--   FROM pg_policies WHERE tablename = 'invoices'
-- UNION ALL
-- SELECT 'invoice_line_items', COUNT(*)
--   FROM pg_policies WHERE tablename = 'invoice_line_items';

COMMIT;
