-- Migration: Create Announcements and Resources Tables
-- Created: 2026-02-12
-- Description: Adds announcements, attachments, reads, comments, resources, storage bucket, indexes, triggers, and RLS policies

BEGIN;

CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE announcement_status AS ENUM ('draft', 'scheduled', 'published', 'expired', 'archived');
CREATE TYPE announcement_category AS ENUM (
  'hr_updates',
  'benefits',
  'events',
  'performance',
  'training',
  'policy',
  'general',
  'emergency'
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  category announcement_category NOT NULL DEFAULT 'general',
  priority announcement_priority NOT NULL DEFAULT 'normal',
  status announcement_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  target_roles user_role[] DEFAULT '{}',
  target_departments uuid[] DEFAULT '{}',
  target_employees uuid[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  allow_comments boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  author_id uuid NOT NULL REFERENCES public.users(id),
  read_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.announcement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  file_path text,
  external_url text,
  is_public boolean DEFAULT false,
  target_roles user_role[] DEFAULT '{}',
  downloads_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_announcements_status ON public.announcements(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_category ON public.announcements(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_priority ON public.announcements(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_is_pinned ON public.announcements(is_pinned) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcement_reads_user_id ON public.announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX idx_announcement_attachments_announcement_id ON public.announcement_attachments(announcement_id);
CREATE INDEX idx_announcement_comments_announcement_id ON public.announcement_comments(announcement_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_category ON public.resources(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_is_public ON public.resources(is_public) WHERE deleted_at IS NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

CREATE POLICY announcements_employee_select_policy ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted_at IS NULL
    AND (
      cardinality(target_roles) = 0 OR get_user_role(auth.uid()) = ANY(target_roles)
    )
    AND (
      cardinality(target_departments) = 0 OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.department_id = ANY(target_departments)
        AND u.deleted_at IS NULL
      )
    )
    AND (
      cardinality(target_employees) = 0 OR auth.uid() = ANY(target_employees)
    )
  );

CREATE POLICY announcements_admin_all_policy ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

CREATE POLICY announcement_attachments_select_policy ON public.announcement_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcements a
      WHERE a.id = announcement_attachments.announcement_id
      AND a.deleted_at IS NULL
      AND (
        (
          a.status = 'published'
          AND (a.published_at IS NULL OR a.published_at <= now())
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND (
            cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
          )
          AND (
            cardinality(a.target_departments) = 0 OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid()
              AND u.department_id = ANY(a.target_departments)
              AND u.deleted_at IS NULL
            )
          )
          AND (
            cardinality(a.target_employees) = 0 OR auth.uid() = ANY(a.target_employees)
          )
        ) OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
      )
    )
  );

CREATE POLICY announcement_attachments_admin_insert_policy ON public.announcement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_attachments.announcement_id
      AND a.deleted_at IS NULL
      AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
    )
  );

CREATE POLICY announcement_attachments_admin_delete_policy ON public.announcement_attachments
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

CREATE POLICY announcement_reads_self_policy ON public.announcement_reads
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY announcement_reads_admin_select_policy ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

CREATE POLICY announcement_comments_select_policy ON public.announcement_comments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_comments.announcement_id
      AND a.deleted_at IS NULL
      AND (
        (
          a.status = 'published'
          AND (a.published_at IS NULL OR a.published_at <= now())
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND (
            cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
          )
          AND (
            cardinality(a.target_departments) = 0 OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid()
              AND u.department_id = ANY(a.target_departments)
              AND u.deleted_at IS NULL
            )
          )
          AND (
            cardinality(a.target_employees) = 0 OR auth.uid() = ANY(a.target_employees)
          )
        ) OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
      )
    )
  );

CREATE POLICY announcement_comments_insert_policy ON public.announcement_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    announcement_comments.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_comments.announcement_id
      AND a.deleted_at IS NULL
      AND a.allow_comments = true
      AND (
        (
          a.status = 'published'
          AND (a.published_at IS NULL OR a.published_at <= now())
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND (
            cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
          )
          AND (
            cardinality(a.target_departments) = 0 OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid()
              AND u.department_id = ANY(a.target_departments)
              AND u.deleted_at IS NULL
            )
          )
          AND (
            cardinality(a.target_employees) = 0 OR auth.uid() = ANY(a.target_employees)
          )
        ) OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
      )
    )
  );

CREATE POLICY announcement_comments_update_delete_owner_policy ON public.announcement_comments
  FOR UPDATE
  TO authenticated
  USING (announcement_comments.user_id = auth.uid())
  WITH CHECK (announcement_comments.user_id = auth.uid());

CREATE POLICY announcement_comments_delete_admin_policy ON public.announcement_comments
  FOR DELETE
  TO authenticated
  USING (
    announcement_comments.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

CREATE POLICY resources_employee_select_policy ON public.resources
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_public = true
      OR cardinality(target_roles) = 0
      OR get_user_role(auth.uid()) = ANY(target_roles)
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
    )
  );

CREATE POLICY resources_admin_all_policy ON public.resources
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_announcement_comments_updated_at
  BEFORE UPDATE ON public.announcement_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_announcements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_resources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE OR REPLACE FUNCTION public.increment_announcement_read_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.announcements
  SET read_count = read_count + 1
  WHERE id = NEW.announcement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_announcement_read_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.announcements
  SET read_count = GREATEST(read_count - 1, 0)
  WHERE id = OLD.announcement_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_announcement_reads_increment
  AFTER INSERT ON public.announcement_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_announcement_read_count();

CREATE TRIGGER trigger_announcement_reads_decrement
  AFTER DELETE ON public.announcement_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_announcement_read_count();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
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
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY announcement_attachments_storage_select_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'announcement-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.announcement_attachments aa
    JOIN public.announcements a ON a.id = aa.announcement_id
    WHERE aa.file_path = storage.objects.name
    AND a.deleted_at IS NULL
    AND (
      (
        a.status = 'published'
        AND (a.published_at IS NULL OR a.published_at <= now())
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND (
          cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
        )
        AND (
          cardinality(a.target_departments) = 0 OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.department_id = ANY(a.target_departments)
            AND u.deleted_at IS NULL
          )
        )
        AND (
          cardinality(a.target_employees) = 0 OR auth.uid() = ANY(a.target_employees)
        )
      ) OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
    )
  )
);

CREATE POLICY announcement_attachments_storage_insert_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcement-attachments'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

CREATE POLICY announcement_attachments_storage_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcement-attachments'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

COMMENT ON TABLE public.announcements IS 'Company announcements with role and department targeting';
COMMENT ON TABLE public.announcement_attachments IS 'Announcement file attachments stored in Supabase Storage';
COMMENT ON TABLE public.announcement_reads IS 'Tracks per-user announcement reads for analytics and unread indicators';
COMMENT ON TABLE public.announcement_comments IS 'Optional comments for announcements with allow_comments enabled';
COMMENT ON TABLE public.resources IS 'Persistent information hub resources';

COMMIT;
