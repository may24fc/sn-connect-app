-- Migration: Create Employees Table
-- Created: 2026-01-23
-- Description: Creates employees table for storing 201 file data

-- UP Migration
BEGIN;

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_number text NOT NULL UNIQUE,
  immediate_head uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Personal Information
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  birthday date,

  -- Employment Information
  date_hired date NOT NULL,
  employment_type employment_type NOT NULL,
  work_arrangement work_arrangement NOT NULL,
  position text NOT NULL,
  department text NOT NULL,
  probation_end_date date,

  -- Payroll Information (sensitive)
  payroll_account_name text,
  payroll_account_number text,

  -- Contact Information
  phone text,
  emergency_contact_name text,
  emergency_contact_number text,
  personal_email text,
  company_email text,

  -- Demographics
  address text,
  city text,
  province text,
  postal_code text,

  -- Standard columns
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Create indexes for common queries
CREATE UNIQUE INDEX idx_employees_employee_number ON public.employees(employee_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_user_id ON public.employees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_immediate_head ON public.employees(immediate_head) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_department ON public.employees(department) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_employment_type ON public.employees(employment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_date_hired ON public.employees(date_hired) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_deleted_at ON public.employees(deleted_at);
CREATE INDEX idx_employees_full_name ON public.employees(last_name, first_name) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

-- Employees can view their own data
CREATE POLICY "employees_select_own_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND deleted_at IS NULL
  );

-- Managers can view their direct reports' data
CREATE POLICY "employees_select_reports_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    immediate_head = auth.uid() AND deleted_at IS NULL
  );

-- HR can view all employee data
CREATE POLICY "employees_select_hr_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'hr'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- COS can view all employee data
CREATE POLICY "employees_select_cos_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'cos'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- CEO can view all employee data
CREATE POLICY "employees_select_ceo_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Admin can view all employee data
CREATE POLICY "employees_select_admin_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Only HR and Admin can insert employees
CREATE POLICY "employees_insert_policy" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

-- HR and Admin can update employee data
CREATE POLICY "employees_update_policy" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

-- Only Admin can delete employees (soft delete)
CREATE POLICY "employees_delete_policy" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    )
  );

-- Comments
COMMENT ON TABLE public.employees IS 'Employee 201 file data - contains all employment records';
COMMENT ON COLUMN public.employees.user_id IS 'References public.users - links to authentication';
COMMENT ON COLUMN public.employees.employee_number IS 'Unique employee identifier';
COMMENT ON COLUMN public.employees.immediate_head IS 'Direct supervisor (CEO or COS)';
COMMENT ON COLUMN public.employees.payroll_account_name IS 'SENSITIVE: Payroll bank account name';
COMMENT ON COLUMN public.employees.payroll_account_number IS 'SENSITIVE: Payroll bank account number';
COMMENT ON COLUMN public.employees.probation_end_date IS 'End date of probationary period (nullable)';
COMMENT ON COLUMN public.employees.deleted_at IS 'Soft delete timestamp';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.employees CASCADE;

COMMIT;
*/
