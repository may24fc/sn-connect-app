-- Migration: 20260227000011_add_knowledge_audit_log.sql
-- Description: Adds version tracking to knowledge sources for edit history (V2-6.2)
-- Source: Admin Assistant feedback — "Edit History for Knowledge Base."
-- Dependencies: 20260221000011_create_knowledge_tables.sql

BEGIN;

-- ============================================
-- 1. Create knowledge_source_versions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_source_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.users(id),
  change_summary text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure unique version numbers per source
  CONSTRAINT uq_knowledge_versions_source_version
    UNIQUE (source_id, version_number)
);

COMMENT ON TABLE public.knowledge_source_versions IS 'Stores version history of knowledge source edits for audit trail and rollback';

-- ============================================
-- 2. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_knowledge_versions_source
  ON public.knowledge_source_versions(source_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_versions_changed_by
  ON public.knowledge_source_versions(changed_by);

CREATE INDEX IF NOT EXISTS idx_knowledge_versions_created_at
  ON public.knowledge_source_versions(created_at DESC);

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE public.knowledge_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_source_versions FORCE ROW LEVEL SECURITY;

-- AI admin roles can read version history
CREATE POLICY knowledge_versions_admin_read_policy
  ON public.knowledge_source_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- AI admin roles can insert version records
CREATE POLICY knowledge_versions_admin_insert_policy
  ON public.knowledge_source_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================
-- 4. Add current_version column to knowledge_sources
-- ============================================
ALTER TABLE public.knowledge_sources
  ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1;

COMMENT ON COLUMN public.knowledge_sources.current_version IS 'Current version number, incremented on each edit';

-- ============================================
-- 5. Create function to snapshot a version before update
-- ============================================
CREATE OR REPLACE FUNCTION snapshot_knowledge_source_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a snapshot if content or title changed
  IF OLD.content IS DISTINCT FROM NEW.content
     OR OLD.title IS DISTINCT FROM NEW.title THEN

    -- Insert old state as a version record
    INSERT INTO public.knowledge_source_versions (
      source_id,
      version_number,
      title,
      content,
      changed_by,
      change_summary,
      metadata
    ) VALUES (
      OLD.id,
      COALESCE(OLD.current_version, 1),
      OLD.title,
      COALESCE(OLD.content, ''),
      COALESCE(
        -- Try to get the current user from auth context
        auth.uid(),
        -- Fallback to updated_by if set in NEW
        NEW.created_by,
        OLD.created_by
      ),
      NULL, -- change_summary can be set via API
      jsonb_build_object(
        'source_type', OLD.source_type,
        'is_active', OLD.is_active,
        'snapshot_at', now()
      )
    );

    -- Increment version number
    NEW.current_version := COALESCE(OLD.current_version, 1) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Create trigger for automatic versioning
-- ============================================
DROP TRIGGER IF EXISTS knowledge_source_version_trigger ON public.knowledge_sources;

CREATE TRIGGER knowledge_source_version_trigger
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL)
  EXECUTE FUNCTION snapshot_knowledge_source_version();

-- ============================================
-- 7. Helper function to get version history
-- ============================================
CREATE OR REPLACE FUNCTION get_knowledge_source_versions(p_source_id uuid)
RETURNS TABLE (
  id uuid,
  version_number integer,
  title text,
  content text,
  changed_by uuid,
  changed_by_name text,
  change_summary text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.version_number,
    v.title,
    v.content,
    v.changed_by,
    COALESCE(
      (SELECT COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
       FROM public.employees e
       WHERE e.user_id = v.changed_by
       LIMIT 1),
      (SELECT u.email FROM public.users u WHERE u.id = v.changed_by LIMIT 1),
      'Unknown'
    ) AS changed_by_name,
    v.change_summary,
    v.metadata,
    v.created_at
  FROM public.knowledge_source_versions v
  WHERE v.source_id = p_source_id
  ORDER BY v.version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_knowledge_source_versions(uuid) IS 'Returns all versions for a knowledge source with editor names';

-- ============================================
-- 8. Helper function to restore a previous version
-- ============================================
CREATE OR REPLACE FUNCTION restore_knowledge_source_version(
  p_source_id uuid,
  p_version_number integer
)
RETURNS public.knowledge_sources AS $$
DECLARE
  v_version public.knowledge_source_versions;
  v_result public.knowledge_sources;
BEGIN
  -- Get the version to restore
  SELECT * INTO v_version
  FROM public.knowledge_source_versions
  WHERE source_id = p_source_id
    AND version_number = p_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for source %', p_version_number, p_source_id;
  END IF;

  -- Update the knowledge source with the version's content
  -- This will trigger the version snapshot automatically
  UPDATE public.knowledge_sources
  SET
    title = v_version.title,
    content = v_version.content,
    updated_at = now()
  WHERE id = p_source_id
    AND deleted_at IS NULL
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knowledge source % not found or deleted', p_source_id;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_knowledge_source_version(uuid, integer) IS 'Restores a knowledge source to a previous version (creates a new version snapshot of current state first)';

COMMIT;
