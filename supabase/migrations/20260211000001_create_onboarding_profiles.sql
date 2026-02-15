-- Migration: Create onboarding profiles/documents tables for post-signin onboarding wizard
-- Created: 2026-02-15
-- Description: Adds onboarding profile storage, document metadata, RLS, indexes, and storage bucket policies

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_step') THEN
    CREATE TYPE onboarding_step AS ENUM ('personal_info', 'payment_info', 'documents', 'review');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_document_type') THEN
    CREATE TYPE onboarding_document_type AS ENUM (
      'valid_id',
      'profile_photo',
      'cv',
      'birth_certificate'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  current_step onboarding_step DEFAULT 'personal_info',

  first_name text,
  middle_name text,
  last_name text,
  position text,
  department_id uuid REFERENCES public.departments(id),
  start_date date,
  nationality text,
  contact_number text,
  email_address text,
  education text,
  birthday date,
  age integer,
  address text,
  emergency_contact_name text,
  emergency_contact_number text,
  emergency_contact_relationship text,
  linkedin_profile_url text,

  payment_account_name text,
  payment_account_number text,
  payment_email text,
  payment_phone_number text,
  payment_address text,
  payment_city text,
  payment_province text,
  payment_zipcode text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_profile_id uuid NOT NULL REFERENCES public.onboarding_profiles(id) ON DELETE CASCADE,
  document_type onboarding_document_type NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(onboarding_profile_id, document_type, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_user_id
  ON public.onboarding_profiles(user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_is_completed
  ON public.onboarding_profiles(is_completed)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_current_step
  ON public.onboarding_profiles(current_step)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_department_id
  ON public.onboarding_profiles(department_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_profile_id
  ON public.onboarding_documents(onboarding_profile_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_document_type
  ON public.onboarding_documents(document_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_documents FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_profiles_select_policy ON public.onboarding_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY onboarding_profiles_insert_policy ON public.onboarding_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY onboarding_profiles_update_policy ON public.onboarding_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY onboarding_documents_select_policy ON public.onboarding_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

CREATE POLICY onboarding_documents_insert_policy ON public.onboarding_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

CREATE POLICY onboarding_documents_update_policy ON public.onboarding_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

CREATE POLICY onboarding_documents_delete_policy ON public.onboarding_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
      )
    )
  );

DROP TRIGGER IF EXISTS trigger_onboarding_profiles_updated_at ON public.onboarding_profiles;
CREATE TRIGGER trigger_onboarding_profiles_updated_at
  BEFORE UPDATE ON public.onboarding_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_onboarding_documents_updated_at ON public.onboarding_documents;
CREATE TRIGGER trigger_onboarding_documents_updated_at
  BEFORE UPDATE ON public.onboarding_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-documents',
  'onboarding-documents',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY onboarding_documents_storage_select_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
);

CREATE POLICY onboarding_documents_storage_insert_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY onboarding_documents_storage_update_policy
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
)
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
);

CREATE POLICY onboarding_documents_storage_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
);

COMMIT;
