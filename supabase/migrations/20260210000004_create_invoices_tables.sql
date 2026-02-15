-- Migration: Create Invoices Tables
-- Created: 2026-02-10
-- Description: Creates invoices and invoice_line_items tables with RLS policies

BEGIN;

CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');

CREATE TABLE public.invoices (
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

CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_employee_id ON public.invoices(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status ON public.invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_period_start ON public.invoices(period_start);
CREATE INDEX idx_invoices_period_end ON public.invoices(period_end);
CREATE INDEX idx_invoices_deleted_at ON public.invoices(deleted_at);

CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items FORCE ROW LEVEL SECURITY;

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
      AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
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
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_invoices_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.invoices IS 'Payroll invoice submissions per employee and pay period';
COMMENT ON TABLE public.invoice_line_items IS 'Detailed invoice line items';
COMMENT ON COLUMN public.invoices.deleted_at IS 'Soft delete timestamp';

COMMIT;
