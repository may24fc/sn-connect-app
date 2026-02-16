-- Migration: Create Internship Management Tables
-- Created: 2026-02-16
-- Description: Adds internships and intern daily logs with RLS policies

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'internship_status'
  ) THEN
    CREATE TYPE internship_status AS ENUM ('active', 'completed', 'terminated', 'converted');
  END IF;
END $$;

CREATE TABLE public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  required_hours integer NOT NULL DEFAULT 480,
  completed_hours numeric(10,2) NOT NULL DEFAULT 0,
  status internship_status NOT NULL DEFAULT 'active',
  supervisor_id uuid REFERENCES public.users(id),
  department text NOT NULL,
  school text,
  program text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internships_hours_non_negative CHECK (required_hours > 0 AND completed_hours >= 0),
  CONSTRAINT internships_end_after_start CHECK (end_date >= start_date)
);

CREATE TABLE public.intern_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  hours_worked numeric(4,2) NOT NULL,
  tasks_completed text NOT NULL,
  learnings text,
  challenges text,
  supervisor_notes text,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(internship_id, log_date),
  CONSTRAINT intern_daily_logs_hours_valid CHECK (hours_worked > 0 AND hours_worked <= 24)
);

CREATE INDEX idx_internships_employee_id ON public.internships(employee_id);
CREATE INDEX idx_internships_supervisor_id ON public.internships(supervisor_id);
CREATE INDEX idx_internships_status ON public.internships(status);
CREATE INDEX idx_internships_dates ON public.internships(start_date, end_date);

CREATE INDEX idx_intern_daily_logs_internship_id ON public.intern_daily_logs(internship_id);
CREATE INDEX idx_intern_daily_logs_date ON public.intern_daily_logs(log_date DESC);
CREATE INDEX idx_intern_daily_logs_approved ON public.intern_daily_logs(is_approved);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.intern_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_daily_logs FORCE ROW LEVEL SECURITY;

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

CREATE POLICY internships_select_supervisor_policy ON public.internships
  FOR SELECT
  TO authenticated
  USING (internships.supervisor_id = auth.uid());

CREATE POLICY internships_admin_all_policy ON public.internships
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

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

CREATE TRIGGER trigger_internships_updated_at
  BEFORE UPDATE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_internships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_intern_daily_logs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.intern_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.internships IS 'Internship period tracking for intern employees';
COMMENT ON TABLE public.intern_daily_logs IS 'Daily logs submitted by interns for EOD reporting';

COMMIT;
