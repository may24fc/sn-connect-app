-- Migration: Repair missing offboarding tables in environments where migration history is ahead of actual schema
-- Created: 2026-03-29

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offboarding_status') THEN
    CREATE TYPE offboarding_status AS ENUM ('initiated', 'in_progress', 'completed');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exit_type') THEN
    CREATE TYPE exit_type AS ENUM ('resignation', 'termination', 'end_of_contract', 'retirement');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.offboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  exit_type exit_type NOT NULL,
  last_working_day date NOT NULL,
  status offboarding_status NOT NULL DEFAULT 'initiated',
  exit_interview_date timestamptz,
  exit_interview_notes text,
  initiated_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS employee_id uuid;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS exit_type exit_type;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS last_working_day date;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS status offboarding_status NOT NULL DEFAULT 'initiated';
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS exit_interview_date timestamptz;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS exit_interview_notes text;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS initiated_by uuid;
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.offboarding ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offboarding_employee_id_fkey'
      AND conrelid = 'public.offboarding'::regclass
  ) THEN
    ALTER TABLE public.offboarding
      ADD CONSTRAINT offboarding_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES public.employees(id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offboarding_initiated_by_fkey'
      AND conrelid = 'public.offboarding'::regclass
  ) THEN
    ALTER TABLE public.offboarding
      ADD CONSTRAINT offboarding_initiated_by_fkey
      FOREIGN KEY (initiated_by) REFERENCES public.users(id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.offboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id uuid NOT NULL REFERENCES public.offboarding(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id),
  due_date date,
  assigned_to uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS offboarding_id uuid;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS completed_by uuid;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.offboarding_tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offboarding_tasks_offboarding_id_fkey'
      AND conrelid = 'public.offboarding_tasks'::regclass
  ) THEN
    ALTER TABLE public.offboarding_tasks
      ADD CONSTRAINT offboarding_tasks_offboarding_id_fkey
      FOREIGN KEY (offboarding_id) REFERENCES public.offboarding(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offboarding_tasks_completed_by_fkey'
      AND conrelid = 'public.offboarding_tasks'::regclass
  ) THEN
    ALTER TABLE public.offboarding_tasks
      ADD CONSTRAINT offboarding_tasks_completed_by_fkey
      FOREIGN KEY (completed_by) REFERENCES public.users(id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offboarding_tasks_assigned_to_fkey'
      AND conrelid = 'public.offboarding_tasks'::regclass
  ) THEN
    ALTER TABLE public.offboarding_tasks
      ADD CONSTRAINT offboarding_tasks_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.users(id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_offboarding_employee_id ON public.offboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_status ON public.offboarding(status);
CREATE INDEX IF NOT EXISTS idx_offboarding_last_working_day ON public.offboarding(last_working_day);
CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_offboarding_id ON public.offboarding_tasks(offboarding_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_is_completed ON public.offboarding_tasks(is_completed);

ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding FORCE ROW LEVEL SECURITY;

ALTER TABLE public.offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offboarding_employee_select_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_select_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_insert_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_update_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_delete_policy ON public.offboarding;

CREATE POLICY offboarding_employee_select_policy ON public.offboarding
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = offboarding.employee_id
        AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY offboarding_admin_select_policy ON public.offboarding
  FOR SELECT TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

CREATE POLICY offboarding_admin_insert_policy ON public.offboarding
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY offboarding_admin_update_policy ON public.offboarding
  FOR UPDATE TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY offboarding_admin_delete_policy ON public.offboarding
  FOR DELETE TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS offboarding_tasks_employee_select_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_employee_update_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_select_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_insert_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_update_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_delete_policy ON public.offboarding_tasks;

CREATE POLICY offboarding_tasks_employee_select_policy ON public.offboarding_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
        AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY offboarding_tasks_employee_update_policy ON public.offboarding_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
        AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY offboarding_tasks_admin_select_policy ON public.offboarding_tasks
  FOR SELECT TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

CREATE POLICY offboarding_tasks_admin_insert_policy ON public.offboarding_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY offboarding_tasks_admin_update_policy ON public.offboarding_tasks
  FOR UPDATE TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY offboarding_tasks_admin_delete_policy ON public.offboarding_tasks
  FOR DELETE TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE OR REPLACE FUNCTION public.update_offboarding_status()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.offboarding_tasks
    WHERE offboarding_id = NEW.offboarding_id
      AND is_completed = false
      AND deleted_at IS NULL
  ) = 0 THEN
    UPDATE public.offboarding
    SET status = 'completed'
    WHERE id = NEW.offboarding_id
      AND status <> 'completed';
  ELSE
    UPDATE public.offboarding
    SET status = 'in_progress'
    WHERE id = NEW.offboarding_id
      AND status = 'initiated';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_offboarding_updated_at ON public.offboarding;
CREATE TRIGGER update_offboarding_updated_at
  BEFORE UPDATE ON public.offboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_offboarding_tasks_updated_at ON public.offboarding_tasks;
CREATE TRIGGER update_offboarding_tasks_updated_at
  BEFORE UPDATE ON public.offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS offboarding_task_status_trigger ON public.offboarding_tasks;
CREATE TRIGGER offboarding_task_status_trigger
  AFTER INSERT OR UPDATE ON public.offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offboarding_status();

COMMENT ON TABLE public.offboarding IS 'Manages employee exit process and offboarding workflow';
COMMENT ON TABLE public.offboarding_tasks IS 'Individual tasks in the offboarding checklist';
COMMENT ON COLUMN public.offboarding.exit_type IS 'Type of employee exit: resignation, termination, end_of_contract, retirement';
COMMENT ON COLUMN public.offboarding.last_working_day IS 'Employee''s last day at the company';
COMMENT ON COLUMN public.offboarding.status IS 'Current status of offboarding process: initiated, in_progress, completed';
COMMENT ON COLUMN public.offboarding.exit_interview_date IS 'Date when exit interview was or will be conducted';
COMMENT ON COLUMN public.offboarding.exit_interview_notes IS 'Notes and feedback from exit interview';
COMMENT ON COLUMN public.offboarding_tasks.category IS 'Task category: access, equipment, documents, knowledge_transfer, accounts';
COMMENT ON COLUMN public.offboarding_tasks.is_completed IS 'Whether the task has been completed';
COMMENT ON COLUMN public.offboarding_tasks.completed_at IS 'Timestamp when task was marked as completed';
COMMENT ON COLUMN public.offboarding_tasks.completed_by IS 'User who marked the task as completed';
COMMENT ON COLUMN public.offboarding_tasks.due_date IS 'Due date for task completion';
COMMENT ON COLUMN public.offboarding_tasks.assigned_to IS 'User assigned to complete this task';

COMMIT;