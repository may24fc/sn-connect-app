-- V2 Phase 7: Add access_level to resources table for view-only video streaming
-- Supports 'full' (download allowed) and 'view_only' (streaming only, no download) modes

-- Create the enum type
DO $$ BEGIN
  CREATE TYPE resource_access_level AS ENUM ('full', 'view_only');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add access_level column to resources table
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS access_level resource_access_level DEFAULT 'full';

-- Add index for filtering by access level
CREATE INDEX IF NOT EXISTS idx_resources_access_level
  ON public.resources(access_level)
  WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.resources.access_level IS
  'Controls download permissions: full = download allowed, view_only = streaming only (signed URLs with short expiry)';
