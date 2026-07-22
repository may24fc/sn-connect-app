-- Migration: Create Associate Evaluations table
-- Created: 2026-07-22
-- Description: Persist 30-60-90 associate evaluations with audit and RLS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.associate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 4),
  overall_assessment text NOT NULL,
  key_strengths text NOT NULL,
  areas_for_continued_growth text NOT NULL,
  overall_performance smallint NOT NULL CHECK (overall_performance BETWEEN 1 AND 5),
  evaluated_by uuid NOT NULL REFERENCES public.users(id),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT uq_associate_evaluations_internship_stage UNIQUE (internship_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_associate_evaluations_internship_id
  ON public.associate_evaluations(internship_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_associate_evaluations_employee_id
  ON public.associate_evaluations(employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_associate_evaluations_evaluated_at
  ON public.associate_evaluations(evaluated_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.associate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associate_evaluations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS associate_evaluations_admin_all_policy ON public.associate_evaluations;
DROP POLICY IF EXISTS associate_evaluations_select_self_policy ON public.associate_evaluations;

CREATE POLICY associate_evaluations_admin_all_policy ON public.associate_evaluations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text = ANY(ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text = ANY(ARRAY['admin', 'super_admin'])
    )
  );

CREATE POLICY associate_evaluations_select_self_policy ON public.associate_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = associate_evaluations.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS trigger_associate_evaluations_updated_at ON public.associate_evaluations;
CREATE TRIGGER trigger_associate_evaluations_updated_at
  BEFORE UPDATE ON public.associate_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_associate_evaluations_audit ON public.associate_evaluations;
CREATE TRIGGER trigger_associate_evaluations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.associate_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.associate_evaluations IS 'Admin evaluations for associates by 30-60-90 stage windows.';

COMMIT;
