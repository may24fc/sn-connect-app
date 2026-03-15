-- Migration: 20260312000002_fix_threshold_and_cache_hit_count.sql
-- Description:
--   1. Lower match_knowledge_embeddings default threshold from 0.78 to 0.25
--      (text-embedding-3-small produces lower similarity scores than ada-002)
--   2. Add increment_cache_hit_count helper function for atomic hit_count bumps

BEGIN;

-- ============================================
-- 1. Update default threshold to 0.25
-- ============================================
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.25,
  match_count INT DEFAULT 8
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

-- ============================================
-- 2. Atomic cache hit count increment
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_cache_hit_count(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.query_cache
  SET hit_count = hit_count + 1,
      updated_at = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
