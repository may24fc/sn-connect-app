-- 2026-06-09: Create resource_folders table and add folder_id to resources
-- Adds a simple, company-visible folder system for resources.

BEGIN;

-- Create resource_folders table
CREATE TABLE IF NOT EXISTS resource_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Add folder_id to resources (nullable, company-wide folders)
ALTER TABLE IF EXISTS resources
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES resource_folders(id) ON DELETE SET NULL;

-- Enable RLS and create basic policies for folders
ALTER TABLE resource_folders ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read active (non-deleted) folders
CREATE POLICY resource_folders_select_policy ON resource_folders
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Allow authenticated users to create folders where they are the creator
CREATE POLICY resource_folders_insert_policy ON resource_folders
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY resource_folders_update_policy ON resource_folders
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY resource_folders_delete_policy ON resource_folders
  FOR DELETE
  USING (created_by = auth.uid());

COMMIT;
