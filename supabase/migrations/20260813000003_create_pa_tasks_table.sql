-- Migration: Create pa_tasks table
-- Created: 2026-08-13
-- Description: Main entries table for the PA/EA Task Tracker module. Standalone
--   from public.tasks (the manager->staff assignment system) — see
--   docs/proposals/pa-ea-task-tracker-module-plan.md §1 for rationale.
-- Dependencies: public.pa_task_statuses, public.pa_task_priorities,
--   public.pa_task_categories, public.pa_task_access_grants

BEGIN;

CREATE TABLE public.pa_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status_id uuid NOT NULL REFERENCES public.pa_task_statuses(id),
  priority_id uuid NOT NULL REFERENCES public.pa_task_priorities(id),
  category_id uuid REFERENCES public.pa_task_categories(id),
  assigned_to uuid REFERENCES public.users(id),
  due_date date,
  date_given date NOT NULL DEFAULT current_date,
  blocker_reason text,
  waiting_on text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_pa_tasks_status_id ON public.pa_tasks(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_priority_id ON public.pa_tasks(priority_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_category_id ON public.pa_tasks(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_assigned_to ON public.pa_tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_due_date ON public.pa_tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_created_by ON public.pa_tasks(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_tasks_deleted_at ON public.pa_tasks(deleted_at);

-- ============================================
-- Guard: "Assigned To" must be a current PA/EA grantee (decision §8 #3)
-- ============================================
CREATE OR REPLACE FUNCTION public.check_pa_task_assignee()
RETURNS trigger AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pa_task_access_grants
      WHERE user_id = NEW.assigned_to
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'assigned_to (%) must hold an active PA/EA task tracker grant', NEW.assigned_to;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_pa_tasks_check_assignee
  BEFORE INSERT OR UPDATE OF assigned_to ON public.pa_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pa_task_assignee();

-- ============================================
-- updated_at trigger (reuses public.handle_updated_at)
-- ============================================
CREATE TRIGGER trigger_pa_tasks_updated_at
  BEFORE UPDATE ON public.pa_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Audit logging (mirrors trigger_tasks_audit on public.tasks)
-- ============================================
CREATE TRIGGER trigger_pa_tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pa_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.pa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY pa_tasks_select_policy ON public.pa_tasks
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.user_has_pa_task_access(auth.uid())
  );

CREATE POLICY pa_tasks_insert_policy ON public.pa_tasks
  FOR INSERT
  WITH CHECK (
    public.user_has_pa_task_access(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY pa_tasks_update_policy ON public.pa_tasks
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.user_has_pa_task_access(auth.uid())
  )
  WITH CHECK (
    public.user_has_pa_task_access(auth.uid())
  );

-- Soft delete only: creator or admin/super_admin (matches task_proofs delete pattern)
CREATE POLICY pa_tasks_delete_policy ON public.pa_tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON TABLE public.pa_tasks IS 'PA/EA Task Tracker entries — standalone from public.tasks, self-service log for PA/EA staff. See docs/proposals/pa-ea-task-tracker-module-plan.md.';
COMMENT ON COLUMN public.pa_tasks.blocker_reason IS 'Short reason set when status = Blocked; full explanation belongs in notes.';
COMMENT ON COLUMN public.pa_tasks.waiting_on IS 'Free text — who/what the task is waiting on (not a user reference).';
COMMENT ON COLUMN public.pa_tasks.date_given IS 'Date the task was given/received; defaults to creation date, editable.';
COMMENT ON COLUMN public.pa_tasks.updated_at IS 'System-managed; not directly editable by clients (set via trigger_pa_tasks_updated_at).';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TRIGGER IF EXISTS trigger_pa_tasks_audit ON public.pa_tasks;
DROP TRIGGER IF EXISTS trigger_pa_tasks_updated_at ON public.pa_tasks;
DROP TRIGGER IF EXISTS trigger_pa_tasks_check_assignee ON public.pa_tasks;
DROP FUNCTION IF EXISTS public.check_pa_task_assignee();
DROP TABLE IF EXISTS public.pa_tasks CASCADE;

COMMIT;
*/
