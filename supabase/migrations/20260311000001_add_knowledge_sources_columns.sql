-- Migration: 20260311000001_add_knowledge_sources_columns.sql
-- Description: Adds missing columns to knowledge_sources table for file metadata,
--              processing status, access control, and tags. Also adds 'txt' to the
--              knowledge_source_type enum and creates the ai-knowledge storage bucket.
-- Dependencies: 20260221000011_create_knowledge_tables.sql

-- ============================================
-- 1. Add 'txt' to knowledge_source_type enum
-- ============================================
-- Must run outside of a transaction (not rolled back on failure).
ALTER TYPE knowledge_source_type ADD VALUE IF NOT EXISTS 'txt';

-- ============================================
-- 2. Add missing columns to knowledge_sources
-- ============================================
ALTER TABLE public.knowledge_sources
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'all';

COMMENT ON COLUMN public.knowledge_sources.description IS 'Optional description of the knowledge source';
COMMENT ON COLUMN public.knowledge_sources.file_name IS 'Original file name as uploaded';
COMMENT ON COLUMN public.knowledge_sources.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.knowledge_sources.mime_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN public.knowledge_sources.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN public.knowledge_sources.processing_status IS 'Processing pipeline status: pending, scanning, chunking, indexing, ready, error';
COMMENT ON COLUMN public.knowledge_sources.access_level IS 'Who can access: all or admin';

-- NOTE: CHECK constraint update (using 'txt') is in migration 20260311000002
--       because PostgreSQL forbids using a newly added enum value in the
--       same transaction it was created in.

-- ============================================
-- 3. Add indexes for new columns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_processing_status
  ON public.knowledge_sources(processing_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_access_level
  ON public.knowledge_sources(access_level);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tags
  ON public.knowledge_sources USING GIN(tags);

-- ============================================
-- 4. Create ai-knowledge storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-knowledge',
  'ai-knowledge',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================
-- 5. Storage RLS policies for ai-knowledge bucket
-- ============================================
-- Admin roles can upload knowledge files
CREATE POLICY "ai_knowledge_admin_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- Authenticated users can read knowledge files
CREATE POLICY "ai_knowledge_authenticated_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-knowledge'
    AND auth.role() = 'authenticated'
  );

-- Admin roles can delete knowledge files
CREATE POLICY "ai_knowledge_admin_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-knowledge'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );
