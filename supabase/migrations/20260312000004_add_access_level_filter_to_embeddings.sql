-- Migration: 20260312000004_add_access_level_filter_to_embeddings.sql
-- Description:
--   Add allowed_access_levels parameter to match_knowledge_embeddings so the
--   AI chat pipeline can enforce role-based access control.
--
--   Callers should pass:
--     allowed_access_levels => ARRAY['all', 'admin']  (admin-level roles)
--     allowed_access_levels => ARRAY['all']            (employee / intern)
--
--   Default is ARRAY['all', 'admin'] for full backward compatibility —
--   existing callers that omit the parameter continue to receive all sources.

BEGIN;

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
    AND ks.access_level = ANY(allowed_access_levels)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.match_knowledge_embeddings(vector, FLOAT, INT, text[])
  IS 'Matches knowledge embeddings by cosine similarity, filtered by access_level. Pass allowed_access_levels to enforce RBAC (e.g. ARRAY[''all''] for employees, ARRAY[''all'',''admin''] for admin roles).';

COMMIT;
