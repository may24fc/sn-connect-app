-- Migration: 20260221000011_create_knowledge_tables.sql
-- Description: Creates vector database schema for AI knowledge base (Phase 6.1)
-- Dependencies: 20260123000001_create_enums_and_extensions.sql, 20260123000007_create_triggers.sql

-- UP Migration
BEGIN;

-- ============================================
-- 1. Enable pgvector extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Create source_type enum for knowledge sources
-- ============================================
CREATE TYPE knowledge_source_type AS ENUM (
  'pdf',
  'docx',
  'url',
  'manual'
);

-- ============================================
-- 3. Create knowledge_sources table
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type knowledge_source_type NOT NULL,
  file_path TEXT,
  url TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_knowledge_sources_file_or_url CHECK (
    (source_type IN ('pdf', 'docx') AND file_path IS NOT NULL)
    OR (source_type = 'url' AND url IS NOT NULL)
    OR (source_type = 'manual' AND content IS NOT NULL)
  )
);

COMMENT ON TABLE public.knowledge_sources IS 'Stores knowledge base source documents for AI policy assistant';

-- ============================================
-- 4. Create knowledge_embeddings table
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Foreign key
  CONSTRAINT fk_knowledge_embeddings_knowledge_sources_source_id
    FOREIGN KEY (source_id)
    REFERENCES public.knowledge_sources(id)
    ON DELETE CASCADE,

  -- Ensure unique chunk per source
  CONSTRAINT uq_knowledge_embeddings_source_chunk
    UNIQUE (source_id, chunk_index)
);

COMMENT ON TABLE public.knowledge_embeddings IS 'Stores vector embeddings of chunked knowledge source content for semantic search';

-- ============================================
-- 5. Enable Row Level Security
-- ============================================
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_embeddings FORCE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies for knowledge_sources
-- ============================================

-- SELECT: All authenticated users can read active knowledge sources
CREATE POLICY knowledge_sources_select_authenticated_policy
  ON public.knowledge_sources
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_active = true
  );

-- SELECT: Admin/HR/super_admin can read all sources (including inactive/deleted)
CREATE POLICY knowledge_sources_select_admin_all_policy
  ON public.knowledge_sources
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- INSERT: Only admin, hr, super_admin can create knowledge sources
CREATE POLICY knowledge_sources_insert_admin_policy
  ON public.knowledge_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- UPDATE: Only admin, hr, super_admin can update knowledge sources
CREATE POLICY knowledge_sources_update_admin_policy
  ON public.knowledge_sources
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- DELETE: Only admin and super_admin can delete knowledge sources
CREATE POLICY knowledge_sources_delete_admin_policy
  ON public.knowledge_sources
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- 7. RLS Policies for knowledge_embeddings
-- ============================================

-- SELECT: All authenticated users can read embeddings for active sources
CREATE POLICY knowledge_embeddings_select_authenticated_policy
  ON public.knowledge_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_sources ks
      WHERE ks.id = source_id
      AND ks.is_active = true
      AND ks.deleted_at IS NULL
    )
  );

-- SELECT: Admin/HR/super_admin can read all embeddings
CREATE POLICY knowledge_embeddings_select_admin_all_policy
  ON public.knowledge_embeddings
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- INSERT: Only admin, hr, super_admin can create embeddings
CREATE POLICY knowledge_embeddings_insert_admin_policy
  ON public.knowledge_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- UPDATE: Only admin, hr, super_admin can update embeddings
CREATE POLICY knowledge_embeddings_update_admin_policy
  ON public.knowledge_embeddings
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- DELETE: Only admin and super_admin can delete embeddings
CREATE POLICY knowledge_embeddings_delete_admin_policy
  ON public.knowledge_embeddings
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- 8. Create Indexes
-- ============================================

-- Foreign key index on source_id
CREATE INDEX idx_knowledge_embeddings_source_id
  ON public.knowledge_embeddings(source_id);

-- IVFFlat index for vector cosine similarity search
-- Note: IVFFlat requires the table to have data before building efficiently.
-- The lists parameter (100) should be tuned based on data volume:
--   Recommended: rows / 1000 for < 1M rows, sqrt(rows) for > 1M rows.
CREATE INDEX idx_knowledge_embeddings_embedding_ivfflat
  ON public.knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for filtering active sources
CREATE INDEX idx_knowledge_sources_is_active
  ON public.knowledge_sources(is_active)
  WHERE deleted_at IS NULL;

-- Index for source_type filtering
CREATE INDEX idx_knowledge_sources_source_type
  ON public.knowledge_sources(source_type);

-- Index for created_by filtering
CREATE INDEX idx_knowledge_sources_created_by
  ON public.knowledge_sources(created_by);

-- GIN index on metadata for JSONB queries
CREATE INDEX idx_knowledge_sources_metadata_gin
  ON public.knowledge_sources USING GIN(metadata);

CREATE INDEX idx_knowledge_embeddings_metadata_gin
  ON public.knowledge_embeddings USING GIN(metadata);

-- ============================================
-- 9. Create Triggers
-- ============================================

-- Auto-update updated_at on knowledge_sources
CREATE TRIGGER trigger_knowledge_sources_updated_at
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Audit logging for knowledge_sources (tracks content management changes)
CREATE TRIGGER trigger_knowledge_sources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- 10. Helper function: Semantic search
-- ============================================
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  source_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_id,
    ke.chunk_index,
    ke.chunk_text,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_embeddings ke
  INNER JOIN public.knowledge_sources ks
    ON ks.id = ke.source_id
  WHERE ks.is_active = true
    AND ks.deleted_at IS NULL
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.match_knowledge_embeddings(vector, FLOAT, INT)
  IS 'Performs semantic similarity search against knowledge embeddings using cosine distance';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP FUNCTION IF EXISTS public.match_knowledge_embeddings(vector, FLOAT, INT) CASCADE;

DROP TRIGGER IF EXISTS trigger_knowledge_sources_audit ON public.knowledge_sources;
DROP TRIGGER IF EXISTS trigger_knowledge_sources_updated_at ON public.knowledge_sources;

DROP INDEX IF EXISTS idx_knowledge_embeddings_metadata_gin;
DROP INDEX IF EXISTS idx_knowledge_sources_metadata_gin;
DROP INDEX IF EXISTS idx_knowledge_sources_created_by;
DROP INDEX IF EXISTS idx_knowledge_sources_source_type;
DROP INDEX IF EXISTS idx_knowledge_sources_is_active;
DROP INDEX IF EXISTS idx_knowledge_embeddings_embedding_ivfflat;
DROP INDEX IF EXISTS idx_knowledge_embeddings_source_id;

DROP TABLE IF EXISTS public.knowledge_embeddings CASCADE;
DROP TABLE IF EXISTS public.knowledge_sources CASCADE;

DROP TYPE IF EXISTS knowledge_source_type CASCADE;

DROP EXTENSION IF EXISTS vector;

COMMIT;
*/
