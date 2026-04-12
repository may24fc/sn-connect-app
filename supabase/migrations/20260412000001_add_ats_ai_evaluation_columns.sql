-- ATS AI Evaluation columns on job_applications
-- Stores parsed resume text and AI-generated evaluation for ranking candidates.

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS parsed_resume_markdown text,
  ADD COLUMN IF NOT EXISTS ai_match_score integer
    CHECK (ai_match_score >= 0 AND ai_match_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_top_strengths jsonb,
  ADD COLUMN IF NOT EXISTS ai_missing_requirements jsonb,
  ADD COLUMN IF NOT EXISTS ai_executive_summary text,
  ADD COLUMN IF NOT EXISTS ai_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_evaluation_model text;

-- Index for sorting candidates by AI score (best first)
CREATE INDEX IF NOT EXISTS idx_job_applications_ai_score
  ON public.job_applications (ai_match_score DESC NULLS LAST)
  WHERE deleted_at IS NULL;
