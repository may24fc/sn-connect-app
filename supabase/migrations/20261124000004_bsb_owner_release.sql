-- The source owner authorized release without separate approval evidence.
-- Retain explicit classification, retention, processor, reader and ACL checks.
ALTER TABLE public.bsb_okf_sources
  DROP CONSTRAINT bsb_okf_sources_check,
  DROP CONSTRAINT bsb_okf_required_evidence;

ALTER TABLE public.bsb_okf_sources
  ADD CONSTRAINT bsb_okf_release_check CHECK (
    decision <> 'approved' OR (
      source_owner_email IS NOT NULL
      AND classification IS NOT NULL
      AND (retention_rule = 'never' OR (retention_rule = 'until' AND retention_until IS NOT NULL))
      AND processor = 'openai'
      AND acl_checked_at IS NOT NULL
      AND reviewer_id IS NOT NULL
      AND decided_at IS NOT NULL
      AND cardinality(allowed_principals) > 0
    )
  );
