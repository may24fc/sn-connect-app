-- Migration: Create task_proofs table
-- Created: 2026-03-22
-- Description: Allows employees/interns to attach proof (links or text notes)
--   for completed tasks assigned by super-admin. Proof is optional.

BEGIN;

CREATE TABLE public.task_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.users(id),
  proof_type text NOT NULL CHECK (proof_type IN ('link', 'note')),
  content text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_task_proofs_task_id ON public.task_proofs(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_proofs_submitted_by ON public.task_proofs(submitted_by) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_proofs FORCE ROW LEVEL SECURITY;

-- RLS Policies

-- Select: assignee, assigner, or admin roles can view proofs
CREATE POLICY "task_proofs_select_policy" ON public.task_proofs
  FOR SELECT
  TO authenticated
  USING (
    task_proofs.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_proofs.task_id
        AND t.deleted_at IS NULL
        AND (
          t.assigned_to = auth.uid()
          OR t.assigned_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
              AND u.role IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
              AND u.deleted_at IS NULL
          )
        )
    )
  );

-- Insert: only the task assignee can submit proof
CREATE POLICY "task_proofs_insert_policy" ON public.task_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_proofs.submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_proofs.task_id
        AND t.deleted_at IS NULL
        AND t.assigned_to = auth.uid()
    )
  );

-- Update: only the submitter can update their own proof
CREATE POLICY "task_proofs_update_policy" ON public.task_proofs
  FOR UPDATE
  TO authenticated
  USING (
    task_proofs.deleted_at IS NULL
    AND task_proofs.submitted_by = auth.uid()
  )
  WITH CHECK (
    task_proofs.submitted_by = auth.uid()
  );

-- Delete: only the submitter can soft delete their own proof
CREATE POLICY "task_proofs_delete_policy" ON public.task_proofs
  FOR DELETE
  TO authenticated
  USING (
    task_proofs.submitted_by = auth.uid()
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_task_proofs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_proofs_updated_at
  BEFORE UPDATE ON public.task_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_proofs_updated_at();

COMMIT;
