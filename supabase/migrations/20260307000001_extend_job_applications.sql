-- Migration: Extend job_applications for full recruitment pipeline
-- Adds 'interview' and 'approved' statuses, plus reviewer tracking

-- Drop and re-create the status check constraint to include new values
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'approved', 'hired'));

-- Add columns for tracking who reviewed/approved
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resume_url text;

-- Add super_admin-only approval policy
CREATE POLICY job_applications_super_admin_approve_policy
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );
