-- Migration: Create Tasks Tables
-- Created: 2026-02-10
-- Description: Creates tasks and task_comments tables with RLS policies

BEGIN;

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.users(id),
  assigned_by uuid NOT NULL REFERENCES public.users(id),
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_by ON public.tasks(assigned_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON public.tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON public.tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deleted_at ON public.tasks(deleted_at);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.deleted_at IS NULL
    AND (
      tasks.assigned_to = auth.uid()
      OR tasks.assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tasks.assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (
      tasks.assigned_to = auth.uid()
      OR tasks.assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
    AND tasks.deleted_at IS NULL
  )
  WITH CHECK (
    (
      tasks.assigned_to = auth.uid()
      OR tasks.assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    tasks.assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "task_comments_select_policy" ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.deleted_at IS NULL
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.assigned_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "task_comments_insert_policy" ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_comments.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.deleted_at IS NULL
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.assigned_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "task_comments_delete_policy" ON public.task_comments
  FOR DELETE
  TO authenticated
  USING (
    task_comments.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.tasks IS 'Task assignments between managers/admins and staff';
COMMENT ON TABLE public.task_comments IS 'Discussion thread for tasks';
COMMENT ON COLUMN public.tasks.deleted_at IS 'Soft delete timestamp';

COMMIT;
