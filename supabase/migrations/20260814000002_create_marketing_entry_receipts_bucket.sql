-- Migration: Create marketing-ad-receipts storage bucket
-- Created: 2026-08-14
-- Description: Private storage bucket for marketing ad expense receipt attachments.
--   Files are folder-scoped by marketing_entry_id: {marketing_entry_id}/{filename}.
-- Dependencies: public.marketing_entries, public.marketing_access_grants

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-ad-receipts',
  'marketing-ad-receipts',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS marketing_ad_receipts_storage_insert_policy ON storage.objects;
CREATE POLICY marketing_ad_receipts_storage_insert_policy ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-ad-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.marketing_entries me
      WHERE me.id::text = (storage.foldername(name))[1]
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

DROP POLICY IF EXISTS marketing_ad_receipts_storage_select_policy ON storage.objects;
CREATE POLICY marketing_ad_receipts_storage_select_policy ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'marketing-ad-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.marketing_entries me
      WHERE me.id::text = (storage.foldername(name))[1]
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

DROP POLICY IF EXISTS marketing_ad_receipts_storage_delete_policy ON storage.objects;
CREATE POLICY marketing_ad_receipts_storage_delete_policy ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'marketing-ad-receipts'
    AND (
      get_user_role(auth.uid())::text = ANY (ARRAY['admin', 'super_admin'])
      OR EXISTS (
        SELECT 1
        FROM public.marketing_entry_receipts mer
        WHERE mer.file_path = name
          AND mer.created_by = auth.uid()
          AND mer.deleted_at IS NULL
      )
    )
  );
