-- Migration: 20260222000012_create_standup_tables.sql
-- Description: Creates stand-up call recording tables for Phase 7
-- Dependencies: 20260123000001_create_enums_and_extensions.sql, 20260123000007_create_triggers.sql

-- UP Migration
BEGIN;

-- ============================================
-- 1. Create standup_recordings table
-- ============================================
CREATE TABLE IF NOT EXISTS public.standup_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  recording_date DATE NOT NULL,
  duration_seconds INTEGER,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  transcript TEXT,
  summary TEXT,
  attendees UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.standup_recordings IS 'Stores stand-up call recordings with transcripts and AI-generated summaries';

-- ============================================
-- 2. Create standup_topics table
-- ============================================
CREATE TABLE IF NOT EXISTS public.standup_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.standup_recordings(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  timestamp_start INTEGER,
  timestamp_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.standup_topics IS 'Stores timestamped topics extracted from stand-up recordings';

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE public.standup_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_recordings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.standup_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_topics FORCE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for standup_recordings
-- ============================================

-- SELECT: All authenticated users can read active recordings
CREATE POLICY standup_recordings_select_authenticated_policy
  ON public.standup_recordings
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Only admin, super_admin roles can create recordings
CREATE POLICY standup_recordings_insert_admin_policy
  ON public.standup_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Only admin, super_admin roles can update recordings
CREATE POLICY standup_recordings_update_admin_policy
  ON public.standup_recordings
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- DELETE: Only admin role can delete recordings
CREATE POLICY standup_recordings_delete_admin_policy
  ON public.standup_recordings
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin']::user_role[])
  );

-- ============================================
-- 5. RLS Policies for standup_topics
-- ============================================

-- SELECT: All authenticated users can read topics for active recordings
CREATE POLICY standup_topics_select_authenticated_policy
  ON public.standup_topics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.standup_recordings sr
      WHERE sr.id = recording_id
      AND sr.deleted_at IS NULL
    )
  );

-- INSERT: Only admin, super_admin roles can create topics
CREATE POLICY standup_topics_insert_admin_policy
  ON public.standup_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Only admin, super_admin roles can update topics
CREATE POLICY standup_topics_update_admin_policy
  ON public.standup_topics
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- DELETE: Only admin, super_admin roles can delete topics
CREATE POLICY standup_topics_delete_admin_policy
  ON public.standup_topics
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- 6. Create Indexes
-- ============================================

-- Index for filtering and ordering by recording date
CREATE INDEX idx_standup_recordings_recording_date
  ON public.standup_recordings(recording_date DESC);

-- Index for created_by filtering
CREATE INDEX idx_standup_recordings_created_by
  ON public.standup_recordings(created_by);

-- Partial index for active recordings (most queries filter deleted_at IS NULL)
CREATE INDEX idx_standup_recordings_deleted_at
  ON public.standup_recordings(deleted_at)
  WHERE deleted_at IS NULL;

-- Foreign key index on recording_id for topics joins
CREATE INDEX idx_standup_topics_recording_id
  ON public.standup_topics(recording_id);

-- ============================================
-- 7. Create Triggers
-- ============================================

-- Auto-update updated_at on standup_recordings
CREATE TRIGGER trigger_standup_recordings_updated_at
  BEFORE UPDATE ON public.standup_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 8. Create Supabase Storage bucket
-- ============================================

-- Create standup-recordings storage bucket (private, 500MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'standup-recordings',
  'standup-recordings',
  false,
  524288000,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. Storage RLS Policies
-- ============================================

-- SELECT: All authenticated users can download recordings
CREATE POLICY standup_recordings_storage_select_policy
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'standup-recordings');

-- INSERT: Only admin roles can upload recordings
CREATE POLICY standup_recordings_storage_insert_policy
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'standup-recordings'
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- DELETE: Only admin roles can remove recordings from storage
CREATE POLICY standup_recordings_storage_delete_policy
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'standup-recordings'
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

COMMIT;

-- ---------------------------------------------------------------------------
-- Rollback (run manually if needed):
-- DROP POLICY IF EXISTS standup_recordings_storage_delete_policy ON storage.objects;
-- DROP POLICY IF EXISTS standup_recordings_storage_insert_policy ON storage.objects;
-- DROP POLICY IF EXISTS standup_recordings_storage_select_policy ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'standup-recordings';
-- DROP TRIGGER IF EXISTS trigger_standup_recordings_updated_at ON public.standup_recordings;
-- DROP TABLE IF EXISTS public.standup_topics;
-- DROP TABLE IF EXISTS public.standup_recordings;
-- ---------------------------------------------------------------------------
