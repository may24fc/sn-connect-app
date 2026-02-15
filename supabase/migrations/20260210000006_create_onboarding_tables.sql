-- Migration: Create onboarding checklists and tasks tables
-- Created: 2026-02-15
-- Description: Adds operational onboarding checklist/task tracking used by onboarding automation workflow

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_status') THEN
    CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status onboarding_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id uuid NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  due_days_from_start integer DEFAULT 7,
  assigned_to uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_employee_id
  ON public.onboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_status
  ON public.onboarding_checklists(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_id
  ON public.onboarding_tasks(checklist_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_category
  ON public.onboarding_tasks(category);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_is_completed
  ON public.onboarding_tasks(is_completed);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_checklists_select_policy ON public.onboarding_checklists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.deleted_at IS NULL
      AND (
        e.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

CREATE POLICY onboarding_checklists_insert_policy ON public.onboarding_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_checklists_update_policy ON public.onboarding_checklists
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_tasks_select_policy ON public.onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.deleted_at IS NULL
      AND (
        e.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

CREATE POLICY onboarding_tasks_insert_policy ON public.onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY onboarding_tasks_update_policy ON public.onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS trigger_onboarding_checklists_updated_at ON public.onboarding_checklists;
CREATE TRIGGER trigger_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
