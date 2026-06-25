-- 2026-06-09: Add approval workflow columns to resources and extend notification_type
-- Adds approval_status, pending_changes, reviewer metadata and notification enum values

BEGIN;

-- Add approval-related columns to resources
ALTER TABLE IF EXISTS resources
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add check constraint for allowed approval states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'resources' AND c.conname = 'resources_approval_status_check'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_approval_status_check CHECK (
        approval_status IN (
          'pending_approval','approved','rejected','pending_update','pending_deletion'
        )
      );
  END IF;
END$$;

-- Add pending_changes JSONB and reviewer metadata
ALTER TABLE IF EXISTS resources
  ADD COLUMN IF NOT EXISTS pending_changes jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_notes text;

-- Backfill existing rows to approved where appropriate
UPDATE resources SET approval_status = 'approved' WHERE approval_status IS NULL AND deleted_at IS NULL;

-- Extend notification_type enum with resource-specific events
DO $$
BEGIN
  BEGIN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_submitted';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_approved';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_rejected';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_deletion_requested';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- RLS: allow authenticated users to insert resources (owners submit)
-- RLS: allow authenticated users to insert resources (owners submit)
CREATE POLICY resources_insert_policy ON resources
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow owners to update their own resources (admin policies still expected elsewhere)
CREATE POLICY resources_owner_update_policy ON resources
  FOR UPDATE
  USING (author_id = auth.uid());

COMMIT;
