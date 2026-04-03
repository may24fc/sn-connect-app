-- Migration: Create Users Table
-- Created: 2026-01-23
-- Description: Creates users table extending Supabase auth.users with HR-specific fields

-- UP Migration
BEGIN;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Create indexes for common queries
CREATE INDEX idx_users_role ON public.users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_department_id ON public.users(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_manager_id ON public.users(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON public.users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Employees can view their own basic info
CREATE POLICY "users_select_own_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND deleted_at IS NULL
  );

-- Managers can view their direct reports
CREATE POLICY "users_select_reports_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() AND deleted_at IS NULL
  );

-- HR, COS, CEO, and Admin can view all users
CREATE POLICY "users_select_privileged_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'cos', 'ceo')
      AND u.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Only HR and Admin can insert users
CREATE POLICY "users_insert_policy" ON public.users
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

-- HR and Admin can update users; users can update their own basic info (limited)
CREATE POLICY "users_update_privileged_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr')
      AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr')
      AND u.deleted_at IS NULL
    )
  );

-- Only Admin can delete users (soft delete)
CREATE POLICY "users_delete_policy" ON public.users
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
COMMENT ON TABLE public.users IS 'Extended user profiles for HR Portal, references auth.users';
COMMENT ON COLUMN public.users.id IS 'References auth.users(id) - primary authentication table';
COMMENT ON COLUMN public.users.role IS 'User role determines access level';
COMMENT ON COLUMN public.users.manager_id IS 'Self-referencing foreign key for reporting structure';
COMMENT ON COLUMN public.users.status IS 'Employment status';
COMMENT ON COLUMN public.users.deleted_at IS 'Soft delete timestamp';

-- Now that public.users exists, create the deferred audit_logs select policy
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

-- Deferred departments policies (moved from 20260123000003)
CREATE POLICY "departments_insert_policy" ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "departments_update_policy" ON public.departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "departments_delete_policy" ON public.departments
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

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.users CASCADE;

COMMIT;
*/
