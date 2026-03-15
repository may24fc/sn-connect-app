-- Migration: 20260311000001_create_query_cache.sql
-- Description: Creates semantic query cache table for AI RAG pipeline (cost optimization)

BEGIN;

-- ============================================
-- 1. Create query_cache table
-- ============================================
CREATE TABLE IF NOT EXISTS public.query_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding vector(1536) NOT NULL,
  response_text TEXT NOT NULL,
  source_citations JSONB DEFAULT '[]'::jsonb,
  hit_count INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
);

COMMENT ON TABLE public.query_cache IS 'Semantic cache for AI chat responses – avoids redundant LLM calls when a similar question was already answered';

-- ============================================
-- 2. Indexes
-- ============================================

-- IVFFlat index for fast cosine similarity search on cached query embeddings
CREATE INDEX IF NOT EXISTS idx_query_cache_embedding_ivfflat
  ON public.query_cache
  USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 50);

-- Expiry index for cleanup
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at
  ON public.query_cache (expires_at);

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_cache FORCE ROW LEVEL SECURITY;

-- Cache is read/written only by service role (API routes use admin client).
-- No direct user access needed.
DROP POLICY IF EXISTS query_cache_service_role_policy ON public.query_cache;
CREATE POLICY query_cache_service_role_policy
  ON public.query_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Auto-update updated_at trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_query_cache_updated_at ON public.query_cache;
CREATE TRIGGER trigger_query_cache_updated_at
  BEFORE UPDATE ON public.query_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. Semantic cache lookup function
-- ============================================
CREATE OR REPLACE FUNCTION public.match_query_cache(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.95,
  max_results INT DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  query_text TEXT,
  response_text TEXT,
  source_citations JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qc.id,
    qc.query_text,
    qc.response_text,
    qc.source_citations,
    1 - (qc.query_embedding <=> match_query_cache.query_embedding) AS similarity
  FROM public.query_cache qc
  WHERE qc.expires_at > NOW()
    AND 1 - (qc.query_embedding <=> match_query_cache.query_embedding) > similarity_threshold
  ORDER BY qc.query_embedding <=> match_query_cache.query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.match_query_cache(vector, FLOAT, INT)
  IS 'Semantic similarity lookup against the query cache for cost-effective RAG responses';

COMMIT;
