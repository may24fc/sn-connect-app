-- BSB is private until a separately reviewed approval record is published.
CREATE TABLE public.bsb_okf_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'sn-group' CHECK (tenant_key = 'sn-group'),
  drive_file_id text NOT NULL UNIQUE,
  title text NOT NULL,
  source_modified_at timestamptz NOT NULL,
  source_owner_email text,
  classification text,
  retention_rule text NOT NULL DEFAULT 'pending' CHECK (retention_rule IN ('pending', 'never', 'until')),
  retention_until timestamptz,
  processor text CHECK (processor IN ('openai', 'vertex-ai')),
  organizer_approval_ref text,
  business_approval_ref text,
  notice_ref text,
  independent_review_ref text,
  acl_checked_at timestamptz,
  acl_evidence_ref text,
  reviewer_id uuid REFERENCES auth.users(id),
  decision text NOT NULL DEFAULT 'draft' CHECK (decision IN ('draft', 'approved', 'revoked')),
  decided_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revocation_reason text,
  okf jsonb NOT NULL,
  allowed_principals text[] NOT NULL DEFAULT '{}',
  imported_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision <> 'approved' OR (
    source_owner_email IS NOT NULL AND classification IS NOT NULL
    AND (retention_rule = 'never' OR (retention_rule = 'until' AND retention_until IS NOT NULL))
    AND processor IS NOT NULL AND organizer_approval_ref IS NOT NULL
    AND business_approval_ref IS NOT NULL AND notice_ref IS NOT NULL
    AND independent_review_ref IS NOT NULL AND acl_checked_at IS NOT NULL
    AND acl_evidence_ref IS NOT NULL AND reviewer_id IS NOT NULL
    AND reviewer_id <> imported_by AND decided_at IS NOT NULL
    AND expires_at IS NOT NULL AND cardinality(allowed_principals) > 0
  ))
);

CREATE INDEX bsb_okf_live_idx ON public.bsb_okf_sources (decision, expires_at)
  WHERE decision = 'approved';
ALTER TABLE public.bsb_okf_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsb_okf_sources FORCE ROW LEVEL SECURITY;
-- Deliberately no client policies: only the authenticated server route may use the service role.
REVOKE ALL ON public.bsb_okf_sources FROM anon, authenticated;
