ALTER TABLE public.bsb_okf_sources
  ADD COLUMN ownership_evidence_ref text,
  ADD COLUMN retention_evidence_ref text,
  ADD COLUMN processor_approval_ref text;

ALTER TABLE public.bsb_okf_sources
  ADD CONSTRAINT bsb_okf_required_evidence CHECK (
    decision <> 'approved' OR (
      nullif(trim(ownership_evidence_ref), '') IS NOT NULL
      AND nullif(trim(retention_evidence_ref), '') IS NOT NULL
      AND nullif(trim(processor_approval_ref), '') IS NOT NULL
    )
  );
