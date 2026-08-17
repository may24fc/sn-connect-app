-- Migration: Create marketing_entry_receipts table
-- Created: 2026-08-14
-- Description: Receipt attachment metadata for ad expense entries.
--   Files are stored in the marketing-ad-receipts bucket
--   (20260814000002_create_marketing_entry_receipts_bucket.sql).

BEGIN;

CREATE TABLE public.marketing_entry_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_entry_id uuid NOT NULL REFERENCES public.marketing_entries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  mime_type text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_marketing_entry_receipts_entry_id
  ON public.marketing_entry_receipts(marketing_entry_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_entry_receipts_created_by
  ON public.marketing_entry_receipts(created_by)
  WHERE deleted_at IS NULL;

ALTER TABLE public.marketing_entry_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_entry_receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY marketing_entry_receipts_select_policy ON public.marketing_entry_receipts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.marketing_entries me
      WHERE me.id = marketing_entry_receipts.marketing_entry_id
        AND me.deleted_at IS NULL
        AND (
          me.submitted_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.marketing_access_grants mag
            WHERE mag.user_id = auth.uid()
              AND mag.platform_id = me.platform_id
              AND mag.can_view_overview = true
              AND mag.deleted_at IS NULL
          )
          OR get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
        )
    )
  );

CREATE POLICY marketing_entry_receipts_insert_policy ON public.marketing_entry_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.marketing_entries me
      WHERE me.id = marketing_entry_receipts.marketing_entry_id
        AND me.deleted_at IS NULL
        AND (
          (
            me.submitted_by = auth.uid()
            AND EXISTS (
              SELECT 1
              FROM public.marketing_access_grants mag
              WHERE mag.user_id = auth.uid()
                AND mag.platform_id = me.platform_id
                AND mag.can_submit = true
                AND mag.deleted_at IS NULL
            )
          )
          OR get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
        )
    )
  );

CREATE POLICY marketing_entry_receipts_update_policy ON public.marketing_entry_receipts
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
  );

CREATE POLICY marketing_entry_receipts_delete_policy ON public.marketing_entry_receipts
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
  );

CREATE TRIGGER trigger_marketing_entry_receipts_updated_at
  BEFORE UPDATE ON public.marketing_entry_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_marketing_entry_receipts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_entry_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.marketing_entry_receipts IS 'Receipt file metadata linked to ad expense entries in marketing_entries.';
COMMENT ON COLUMN public.marketing_entry_receipts.file_path IS 'Path within the marketing-ad-receipts storage bucket.';

COMMIT;
