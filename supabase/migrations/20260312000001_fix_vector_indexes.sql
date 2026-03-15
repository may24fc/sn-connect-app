-- Migration: 20260312000001_fix_vector_indexes.sql
-- Description: Replace IVFFlat vector indexes with HNSW indexes.
--   IVFFlat indexes created on empty tables produce degenerate partitions,
--   causing similarity searches to return zero results at default probes=1.
--   HNSW indexes do not require pre-training and work correctly at any data volume.

BEGIN;

-- ============================================
-- 1. Replace knowledge_embeddings IVFFlat → HNSW
-- ============================================
DROP INDEX IF EXISTS public.idx_knowledge_embeddings_embedding_ivfflat;

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_embedding_hnsw
  ON public.knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- 2. Replace query_cache IVFFlat → HNSW
-- ============================================
DROP INDEX IF EXISTS public.idx_query_cache_embedding_ivfflat;

CREATE INDEX IF NOT EXISTS idx_query_cache_embedding_hnsw
  ON public.query_cache
  USING hnsw (query_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- 3. Update match_knowledge_embeddings function
--    (keep SECURITY DEFINER STABLE, no functional change)
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

COMMIT;
