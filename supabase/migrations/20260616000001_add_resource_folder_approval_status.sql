-- 2026-06-16: Add approval workflow columns for resource_folders
-- Allows creator deletion requests to be subject to admin approval.

BEGIN;

ALTER TABLE IF EXISTS public.resource_folders
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('approved', 'pending_deletion'));

ALTER TABLE IF EXISTS public.resource_folders
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE IF EXISTS public.resource_folders
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE IF EXISTS public.resource_folders
  ADD COLUMN IF NOT EXISTS reviewer_notes text;

UPDATE public.resource_folders
SET approval_status = 'approved'
WHERE approval_status IS NULL;

COMMIT;
