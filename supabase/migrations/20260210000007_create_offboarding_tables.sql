-- Migration: Create offboarding tables
-- Description: Manages employee exit process with offboarding checklists and tasks
-- Date: 2026-02-16

-- Create offboarding status enum
CREATE TYPE offboarding_status AS ENUM ('initiated', 'in_progress', 'completed');

-- Create exit type enum
CREATE TYPE exit_type AS ENUM ('resignation', 'termination', 'end_of_contract', 'retirement');

-- Create offboarding table
CREATE TABLE IF NOT EXISTS public.offboarding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  exit_type exit_type NOT NULL,
  last_working_day date NOT NULL,
  status offboarding_status NOT NULL DEFAULT 'initiated',
  exit_interview_date timestamptz,
  exit_interview_notes text,
  initiated_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create offboarding tasks table
CREATE TABLE IF NOT EXISTS public.offboarding_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  offboarding_id uuid NOT NULL REFERENCES public.offboarding(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL, -- 'access', 'equipment', 'documents', 'knowledge_transfer', 'accounts'
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id),
  due_date date,
  assigned_to uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes for performance
CREATE INDEX idx_offboarding_employee_id ON public.offboarding(employee_id);
CREATE INDEX idx_offboarding_status ON public.offboarding(status);
CREATE INDEX idx_offboarding_last_working_day ON public.offboarding(last_working_day);
CREATE INDEX idx_offboarding_tasks_offboarding_id ON public.offboarding_tasks(offboarding_id);
CREATE INDEX idx_offboarding_tasks_is_completed ON public.offboarding_tasks(is_completed);

-- Enable RLS
ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding FORCE ROW LEVEL SECURITY;

ALTER TABLE public.offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_tasks FORCE ROW LEVEL SECURITY;

-- RLS Policies for offboarding table

-- Policy: Employees can view their own offboarding records
CREATE POLICY offboarding_employee_select_policy ON public.offboarding
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = offboarding.employee_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Policy: Admin/HR/Super Admin can view all offboarding records
CREATE POLICY offboarding_admin_select_policy ON public.offboarding
  FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    AND deleted_at IS NULL
  );

-- Policy: Admin/HR/Super Admin can insert offboarding records
CREATE POLICY offboarding_admin_insert_policy ON public.offboarding
  FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Policy: Admin/HR/Super Admin can update offboarding records
CREATE POLICY offboarding_admin_update_policy ON public.offboarding
  FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Policy: Admin/HR/Super Admin can soft delete offboarding records
CREATE POLICY offboarding_admin_delete_policy ON public.offboarding
  FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- RLS Policies for offboarding_tasks table

-- Policy: Employees can view their own offboarding tasks
CREATE POLICY offboarding_tasks_employee_select_policy ON public.offboarding_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Policy: Employees can update their own offboarding tasks (mark as completed)
CREATE POLICY offboarding_tasks_employee_update_policy ON public.offboarding_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
  );

-- Policy: Admin/HR/Super Admin can view all offboarding tasks
CREATE POLICY offboarding_tasks_admin_select_policy ON public.offboarding_tasks
  FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    AND deleted_at IS NULL
  );

-- Policy: Admin/HR/Super Admin can insert offboarding tasks
CREATE POLICY offboarding_tasks_admin_insert_policy ON public.offboarding_tasks
  FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Policy: Admin/HR/Super Admin can update offboarding tasks
CREATE POLICY offboarding_tasks_admin_update_policy ON public.offboarding_tasks
  FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Policy: Admin/HR/Super Admin can soft delete offboarding tasks
CREATE POLICY offboarding_tasks_admin_delete_policy ON public.offboarding_tasks
  FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Create trigger to update updated_at timestamp for offboarding
CREATE TRIGGER update_offboarding_updated_at
  BEFORE UPDATE ON public.offboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at timestamp for offboarding_tasks
CREATE TRIGGER update_offboarding_tasks_updated_at
  BEFORE UPDATE ON public.offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-update offboarding status when all tasks are completed
CREATE OR REPLACE FUNCTION public.update_offboarding_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all required tasks are completed
  IF (
    SELECT COUNT(*) 
    FROM public.offboarding_tasks 
    WHERE offboarding_id = NEW.offboarding_id 
    AND is_completed = false
    AND deleted_at IS NULL
  ) = 0 THEN
    -- Update offboarding status to completed
    UPDATE public.offboarding
    SET status = 'completed'
    WHERE id = NEW.offboarding_id
    AND status != 'completed';
  ELSE
    -- Update offboarding status to in_progress if at least one task is completed
    UPDATE public.offboarding
    SET status = 'in_progress'
    WHERE id = NEW.offboarding_id
    AND status = 'initiated';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER offboarding_task_status_trigger
  AFTER INSERT OR UPDATE ON public.offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offboarding_status();

-- Comment on tables
COMMENT ON TABLE public.offboarding IS 'Manages employee exit process and offboarding workflow';
COMMENT ON TABLE public.offboarding_tasks IS 'Individual tasks in the offboarding checklist';

-- Comment on columns
COMMENT ON COLUMN public.offboarding.exit_type IS 'Type of employee exit: resignation, termination, end_of_contract, retirement';
COMMENT ON COLUMN public.offboarding.last_working_day IS 'Employee''s last day at the company';
COMMENT ON COLUMN public.offboarding.status IS 'Current status of offboarding process: initiated, in_progress, completed';
COMMENT ON COLUMN public.offboarding.exit_interview_date IS 'Date when exit interview was/will be conducted';
COMMENT ON COLUMN public.offboarding.exit_interview_notes IS 'Notes and feedback from exit interview';

COMMENT ON COLUMN public.offboarding_tasks.category IS 'Task category: access, equipment, documents, knowledge_transfer, accounts';
COMMENT ON COLUMN public.offboarding_tasks.is_completed IS 'Whether the task has been completed';
COMMENT ON COLUMN public.offboarding_tasks.completed_at IS 'Timestamp when task was marked as completed';
COMMENT ON COLUMN public.offboarding_tasks.completed_by IS 'User who marked the task as completed';
COMMENT ON COLUMN public.offboarding_tasks.due_date IS 'Due date for task completion';
COMMENT ON COLUMN public.offboarding_tasks.assigned_to IS 'User assigned to complete this task (usually HR or IT)';
