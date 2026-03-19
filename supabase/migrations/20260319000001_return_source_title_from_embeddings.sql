-- Migration: 20260319000001_return_source_title_from_embeddings.sql
-- Description:
--   Add ks.title (as source_title) to the match_knowledge_embeddings return
--   columns so the AI chat pipeline can display the real document title
--   instead of relying on per-chunk metadata (which may omit the title).

BEGIN;

DROP FUNCTION IF EXISTS public.match_knowledge_embeddings(vector, double precision, integer, text[]);

CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.25,
  match_count INT DEFAULT 8,
  allowed_access_levels text[] DEFAULT ARRAY['all', 'admin']
)
RETURNS TABLE(
  id UUID,
  source_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT,
  source_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_id,
    ke.chunk_index,
    ke.chunk_text,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity,
    ks.title AS source_title
  FROM public.knowledge_embeddings ke
  INNER JOIN public.knowledge_sources ks
    ON ks.id = ke.source_id
  WHERE ks.is_active = true
    AND ks.deleted_at IS NULL
    AND ks.access_level = ANY(allowed_access_levels)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.match_knowledge_embeddings(vector, FLOAT, INT, text[])
  IS 'Matches knowledge embeddings by cosine similarity, filtered by access_level. Now also returns source_title from knowledge_sources.';

COMMIT;
