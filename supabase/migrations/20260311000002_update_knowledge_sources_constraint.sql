-- Migration: 20260311000002_update_knowledge_sources_constraint.sql
-- Description: Updates the CHECK constraint on knowledge_sources to include 'txt' type.
--              Must be a separate migration from the one that added 'txt' to the enum,
--              because PostgreSQL forbids using a newly added enum value in the same
--              transaction where ALTER TYPE ... ADD VALUE was executed.
-- Dependencies: 20260311000001_add_knowledge_sources_columns.sql

ALTER TABLE public.knowledge_sources
  DROP CONSTRAINT IF EXISTS chk_knowledge_sources_file_or_url;

ALTER TABLE public.knowledge_sources
  ADD CONSTRAINT chk_knowledge_sources_file_or_url CHECK (
    (source_type IN ('pdf', 'docx', 'txt') AND file_path IS NOT NULL)
    OR (source_type = 'url' AND url IS NOT NULL)
    OR (source_type = 'manual' AND content IS NOT NULL)
  );
