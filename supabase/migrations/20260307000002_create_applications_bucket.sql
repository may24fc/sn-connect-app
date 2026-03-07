-- Migration: Create applications storage bucket
-- Description: Storage bucket for resumes/CVs submitted with job applications

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applications',
  'applications',
  false,
  5242880, -- 5MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Admins and super_admins can read resumes
CREATE POLICY applications_admin_read_policy
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Service role (used by the API) can insert/delete
CREATE POLICY applications_service_insert_policy
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'applications');

CREATE POLICY applications_service_delete_policy
  ON storage.objects FOR DELETE
  USING (bucket_id = 'applications');
