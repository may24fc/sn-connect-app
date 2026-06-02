BEGIN;

ALTER TABLE public.performance_evaluation_drafts
  DROP CONSTRAINT IF EXISTS performance_evaluation_drafts_evaluation_kind_check;

ALTER TABLE public.performance_evaluation_drafts
  ADD CONSTRAINT performance_evaluation_drafts_evaluation_kind_check
  CHECK (evaluation_kind IN ('monthly', 'quarterly', 'five_percent', 'monthly_call_feedback'));

COMMIT;