-- Migration: 20260216000020_repair_internship_tables.sql
-- Description: Repair/ensure internship tables exist. The original migration
--   20260210000010_create_internship_tables.sql failed to apply, resulting in
--   PGRST205 "Could not find the table 'public.internships'" errors.
-- Dependencies: employees, users, auth.users, user_role enum (with super_admin),
--   handle_updated_at(), handle_audit_log()

BEGIN;

-- ============================================
-- 1. Ensure internship_status enum exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'internship_status'
  ) THEN
    CREATE TYPE internship_status AS ENUM ('active', 'completed', 'terminated', 'converted');
  END IF;
END $$;

-- ============================================
-- 2. Create internships table
-- ============================================

CREATE TABLE IF NOT EXISTS public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  required_hours integer NOT NULL DEFAULT 480,
  completed_hours numeric(10,2) NOT NULL DEFAULT 0,
  status internship_status NOT NULL DEFAULT 'active',
  supervisor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  department text NOT NULL,
  school text,
  program text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT chk_internships_hours_non_negative CHECK (required_hours > 0 AND completed_hours >= 0),
  CONSTRAINT chk_internships_end_after_start CHECK (end_date >= start_date)
);

-- ============================================
-- 3. Create intern_daily_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS public.intern_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  hours_worked numeric(4,2) NOT NULL,
  tasks_completed text NOT NULL,
  learnings text,
  challenges text,
  supervisor_notes text,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT uq_intern_daily_logs_internship_date UNIQUE (internship_id, log_date),
  CONSTRAINT chk_intern_daily_logs_hours_valid CHECK (hours_worked > 0 AND hours_worked <= 24)
);

-- ============================================
-- 4. Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_internships_employee_id ON public.internships(employee_id);
CREATE INDEX IF NOT EXISTS idx_internships_supervisor_id ON public.internships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_internships_status ON public.internships(status);
CREATE INDEX IF NOT EXISTS idx_internships_dates ON public.internships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_internships_deleted_at ON public.internships(deleted_at);

CREATE INDEX IF NOT EXISTS idx_intern_daily_logs_internship_id ON public.intern_daily_logs(internship_id);
CREATE INDEX IF NOT EXISTS idx_intern_daily_logs_date ON public.intern_daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_intern_daily_logs_approved ON public.intern_daily_logs(is_approved);

-- ============================================
-- 5. Enable RLS
-- ============================================

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.intern_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_daily_logs FORCE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies for internships
-- ============================================

-- Drop any existing policies to avoid conflicts (idempotent)
DROP POLICY IF EXISTS internships_select_self_policy ON public.internships;
DROP POLICY IF EXISTS internships_select_supervisor_policy ON public.internships;
DROP POLICY IF EXISTS internships_admin_all_policy ON public.internships;

-- Interns can view their own internship record
CREATE POLICY internships_select_self_policy ON public.internships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = internships.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

-- Supervisors can view internships they supervise
CREATE POLICY internships_select_supervisor_policy ON public.internships
  FOR SELECT
  TO authenticated
  USING (internships.supervisor_id = auth.uid());

-- Admin, HR, CoS, CEO, and Super Admin have full access
CREATE POLICY internships_admin_all_policy ON public.internships
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

-- ============================================
-- 7. RLS Policies for intern_daily_logs
-- ============================================

DROP POLICY IF EXISTS intern_daily_logs_select_policy ON public.intern_daily_logs;
DROP POLICY IF EXISTS intern_daily_logs_insert_policy ON public.intern_daily_logs;
DROP POLICY IF EXISTS intern_daily_logs_update_policy ON public.intern_daily_logs;

-- SELECT: intern (own logs), supervisor, or admin roles
CREATE POLICY intern_daily_logs_select_policy ON public.intern_daily_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.internships i
      JOIN public.employees e ON e.id = i.employee_id
      WHERE i.id = intern_daily_logs.internship_id
        AND e.deleted_at IS NULL
        AND (
          e.user_id = auth.uid()
          OR i.supervisor_id = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
        )
    )
  );

-- INSERT: intern (own logs) or admin roles
CREATE POLICY intern_daily_logs_insert_policy ON public.intern_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.internships i
      JOIN public.employees e ON e.id = i.employee_id
      WHERE i.id = intern_daily_logs.internship_id
        AND e.deleted_at IS NULL
        AND (
          e.user_id = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
        )
    )
  );

-- UPDATE: supervisor or admin roles only (for approving logs, adding notes)
CREATE POLICY intern_daily_logs_update_policy ON public.intern_daily_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.internships i
      WHERE i.id = intern_daily_logs.internship_id
        AND (
          i.supervisor_id = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.internships i
      WHERE i.id = intern_daily_logs.internship_id
        AND (
          i.supervisor_id = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
        )
    )
  );

-- ============================================
-- 8. Triggers
-- ============================================

-- updated_at trigger for internships
DROP TRIGGER IF EXISTS trigger_internships_updated_at ON public.internships;
CREATE TRIGGER trigger_internships_updated_at
  BEFORE UPDATE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- updated_at trigger for intern_daily_logs
DROP TRIGGER IF EXISTS trigger_intern_daily_logs_updated_at ON public.intern_daily_logs;
CREATE TRIGGER trigger_intern_daily_logs_updated_at
  BEFORE UPDATE ON public.intern_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Audit triggers
DROP TRIGGER IF EXISTS trigger_internships_audit ON public.internships;
CREATE TRIGGER trigger_internships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS trigger_intern_daily_logs_audit ON public.intern_daily_logs;
CREATE TRIGGER trigger_intern_daily_logs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.intern_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- 9. Table comments
-- ============================================

COMMENT ON TABLE public.internships IS 'Internship period tracking for intern employees';
COMMENT ON TABLE public.intern_daily_logs IS 'Daily logs submitted by interns for EOD reporting';

COMMIT;

-- ============================================
-- Validation Queries (run manually to verify)
-- ============================================
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internships');
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intern_daily_logs');
-- SELECT policyname FROM pg_policies WHERE tablename = 'internships';
-- SELECT policyname FROM pg_policies WHERE tablename = 'intern_daily_logs';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'internships';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'intern_daily_logs';
