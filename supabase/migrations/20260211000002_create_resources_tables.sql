-- Migration: Create Resources / Information Hub Tables
-- Created: 2026-02-11
-- Description: Comprehensive resources schema for the Information Hub feature
-- Includes: ENUMs, tables, RLS policies, indexes, full-text search, triggers, and storage buckets

BEGIN;

-- ============================================
-- Step 1: Drop existing simple resources table and recreate with full schema
-- ============================================

-- First, drop the existing simple resources table and its dependencies
DROP TRIGGER IF EXISTS trigger_resources_updated_at ON public.resources;
DROP TRIGGER IF EXISTS trigger_resources_audit ON public.resources;
DROP POLICY IF EXISTS resources_employee_select_policy ON public.resources;
DROP POLICY IF EXISTS resources_admin_all_policy ON public.resources;
DROP INDEX IF EXISTS idx_resources_category;
DROP INDEX IF EXISTS idx_resources_is_public;
DROP TABLE IF EXISTS public.resources;

-- ============================================
-- Step 2: Create ENUMs
-- ============================================

CREATE TYPE resource_type AS ENUM (
  'video',
  'document',
  'image',
  'link',
  'presentation',
  'interactive'
);

CREATE TYPE resource_category AS ENUM (
  'onboarding',
  'training',
  'policies',
  'benefits',
  'tools',
  'culture',
  'department_specific',
  'forms_templates',
  'performance',
  'emergency'
);

CREATE TYPE resource_status AS ENUM ('draft', 'published', 'archived');

-- ============================================
-- Step 3: Create resources table with full schema
-- ============================================

CREATE TABLE public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic Information
  title text NOT NULL,
  description text,
  excerpt text, -- Short summary (auto-generated from first 200 chars if null)

  -- Classification
  resource_type resource_type NOT NULL,
  category resource_category NOT NULL,
  subcategory text, -- Freeform subcategory within main category
  tags text[] DEFAULT '{}', -- Searchable tags (e.g., ['remote-work', 'productivity', 'tips'])

  -- Content Location
  file_path text, -- Supabase Storage path for uploaded files
  external_url text, -- External link (YouTube, Vimeo, Google Docs, etc.)
  thumbnail_path text, -- Thumbnail image for videos/documents

  -- Metadata
  file_size bigint, -- Size in bytes (for uploaded files)
  mime_type text, -- MIME type (e.g., 'video/mp4', 'application/pdf')
  duration_seconds integer, -- Video/audio duration

  -- Publishing
  status resource_status NOT NULL DEFAULT 'draft',
  published_at timestamptz, -- Null = draft, future = scheduled, past = published
  expires_at timestamptz, -- Null = never expires

  -- Targeting (similar to announcements)
  is_public boolean DEFAULT false, -- If true, visible to all roles
  target_roles user_role[] DEFAULT '{}', -- Empty array = all roles
  target_departments uuid[] DEFAULT '{}', -- Empty array = all departments
  target_employees uuid[] DEFAULT '{}', -- Specific employees (overrides role/dept)

  -- Display Options
  is_featured boolean DEFAULT false, -- Show in featured section
  is_pinned boolean DEFAULT false, -- Pin to top of category
  display_order integer DEFAULT 0, -- Custom ordering within category

  -- Engagement Metrics
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  bookmark_count integer DEFAULT 0,

  -- Versioning
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES public.resources(id), -- Link to previous version

  -- Audit
  author_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================
-- Step 4: Create resource_collections table
-- ============================================

CREATE TABLE public.resource_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  thumbnail_path text,
  is_public boolean DEFAULT false,
  target_roles user_role[] DEFAULT '{}',
  target_departments uuid[] DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================
-- Step 5: Create collection_resources junction table
-- ============================================

CREATE TABLE public.collection_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.resource_collections(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(collection_id, resource_id)
);

-- ============================================
-- Step 6: Create resource_bookmarks table
-- ============================================

CREATE TABLE public.resource_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes text, -- Personal notes about the resource
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(resource_id, user_id)
);

-- ============================================
-- Step 7: Create resource_views table
-- ============================================

CREATE TABLE public.resource_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  duration_seconds integer, -- How long they watched/read (if trackable)
  completed boolean DEFAULT false -- Did they complete the resource (video, course, etc.)
);

-- ============================================
-- Step 8: Create indexes for performance
-- ============================================

-- Resources table indexes
CREATE INDEX idx_resources_status ON public.resources(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_category ON public.resources(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_type ON public.resources(resource_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_is_featured ON public.resources(is_featured) WHERE deleted_at IS NULL AND is_featured = true;
CREATE INDEX idx_resources_is_pinned ON public.resources(is_pinned) WHERE deleted_at IS NULL AND is_pinned = true;
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_published_at ON public.resources(published_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_author_id ON public.resources(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_display_order ON public.resources(display_order) WHERE deleted_at IS NULL;

-- Resource views indexes
CREATE INDEX idx_resource_views_user_id ON public.resource_views(user_id);
CREATE INDEX idx_resource_views_resource_id ON public.resource_views(resource_id);
CREATE INDEX idx_resource_views_viewed_at ON public.resource_views(viewed_at DESC);

-- Resource bookmarks indexes
CREATE INDEX idx_resource_bookmarks_user_id ON public.resource_bookmarks(user_id);
CREATE INDEX idx_resource_bookmarks_resource_id ON public.resource_bookmarks(resource_id);

-- Resource collections indexes
CREATE INDEX idx_resource_collections_author_id ON public.resource_collections(author_id) WHERE deleted_at IS NULL;

-- Collection resources indexes
CREATE INDEX idx_collection_resources_collection_id ON public.collection_resources(collection_id);
CREATE INDEX idx_collection_resources_resource_id ON public.collection_resources(resource_id);
CREATE INDEX idx_collection_resources_display_order ON public.collection_resources(collection_id, display_order);

-- ============================================
-- Step 9: Create full-text search index
-- PG17 requires IMMUTABLE functions in index expressions.
-- to_tsvector is STABLE, so we create an IMMUTABLE wrapper.
-- ============================================

CREATE OR REPLACE FUNCTION public.resources_search_vector(title text, description text, tags text[])
RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(tags, ' '));
$$;

CREATE INDEX idx_resources_search ON public.resources USING GIN(
  resources_search_vector(title, description, tags)
) WHERE deleted_at IS NULL;

-- ============================================
-- Step 10: Enable RLS on all tables
-- ============================================

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collection_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_resources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookmarks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views FORCE ROW LEVEL SECURITY;

-- ============================================
-- Step 11: RLS Policies for resources table
-- ============================================

-- Resources: Employees can only see published, non-expired resources targeted to them
CREATE POLICY resources_employee_select_policy ON public.resources
  FOR SELECT
  TO authenticated
  USING (
    -- Must be published and not expired
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted_at IS NULL
    AND (
      -- Public resources visible to all
      is_public = true OR
      -- Targeted to user's role (or no role targeting)
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles))
    )
    AND (
      -- Targeted to user's department (or no department targeting)
      (cardinality(target_departments) = 0) OR
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.department_id = ANY(target_departments)
        AND u.deleted_at IS NULL
      )
    )
    AND (
      -- Targeted to specific employees (or no employee targeting)
      (cardinality(target_employees) = 0) OR
      (auth.uid() = ANY(target_employees))
    )
  );

-- Resources: Admin/HR/Super Admin can see and manage all resources
CREATE POLICY resources_admin_all_policy ON public.resources
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

-- ============================================
-- Step 12: RLS Policies for resource_collections table
-- ============================================

-- Collections: Employees can view collections targeted to them
CREATE POLICY collections_employee_select_policy ON public.resource_collections
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_public = true OR
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles)) OR
      (
        cardinality(target_departments) = 0 OR
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.department_id = ANY(target_departments)
          AND u.deleted_at IS NULL
        )
      )
    )
  );

-- Collections: Admin/HR/Super Admin can manage all collections
CREATE POLICY collections_admin_all_policy ON public.resource_collections
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

-- ============================================
-- Step 13: RLS Policies for collection_resources table
-- ============================================

-- Collection resources: Inherit access from parent collection
CREATE POLICY collection_resources_select_policy ON public.collection_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resource_collections rc
      WHERE rc.id = collection_resources.collection_id
      AND rc.deleted_at IS NULL
      AND (
        rc.is_public = true OR
        (cardinality(rc.target_roles) = 0) OR
        (get_user_role(auth.uid()) = ANY(rc.target_roles)) OR
        user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
      )
    )
  );

-- Collection resources: Admin can manage
CREATE POLICY collection_resources_admin_all_policy ON public.collection_resources
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

-- ============================================
-- Step 14: RLS Policies for resource_bookmarks table
-- ============================================

-- Resource Bookmarks: Users can only manage their own bookmarks
CREATE POLICY bookmarks_self_policy ON public.resource_bookmarks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Resource Bookmarks: Admins can see all bookmarks (for analytics)
CREATE POLICY bookmarks_admin_select_policy ON public.resource_bookmarks
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

-- ============================================
-- Step 15: RLS Policies for resource_views table
-- ============================================

-- Resource Views: Users can only insert/select their own views
CREATE POLICY views_self_policy ON public.resource_views
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Resource Views: Admins can see all views (for analytics)
CREATE POLICY views_admin_select_policy ON public.resource_views
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
  );

-- ============================================
-- Step 16: Create trigger functions
-- ============================================

-- Trigger to increment view_count on resource_views insert
CREATE OR REPLACE FUNCTION public.increment_resource_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment/decrement bookmark_count on bookmark insert/delete
CREATE OR REPLACE FUNCTION public.update_resource_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.resources
    SET bookmark_count = bookmark_count + 1
    WHERE id = NEW.resource_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resources
    SET bookmark_count = GREATEST(bookmark_count - 1, 0)
    WHERE id = OLD.resource_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment download_count (called by application when generating signed URLs)
CREATE OR REPLACE FUNCTION public.increment_resource_download_count(resource_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.resources
  SET download_count = download_count + 1
  WHERE id = resource_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate excerpt from description
CREATE OR REPLACE FUNCTION public.auto_generate_resource_excerpt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.excerpt IS NULL AND NEW.description IS NOT NULL THEN
    NEW.excerpt := left(NEW.description, 200);
    IF length(NEW.description) > 200 THEN
      NEW.excerpt := NEW.excerpt || '...';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 17: Create triggers
-- ============================================

-- View count trigger
CREATE TRIGGER resource_view_count_trigger
  AFTER INSERT ON public.resource_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_resource_view_count();

-- Bookmark count trigger
CREATE TRIGGER resource_bookmark_count_trigger
  AFTER INSERT OR DELETE ON public.resource_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resource_bookmark_count();

-- Auto excerpt trigger
CREATE TRIGGER resource_auto_excerpt_trigger
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_resource_excerpt();

-- Updated_at triggers
CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_resource_collections_updated_at
  BEFORE UPDATE ON public.resource_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Audit log triggers
CREATE TRIGGER trigger_resources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_resource_collections_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.resource_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- Step 18: Create Storage buckets
-- ============================================

-- Create resources-library bucket (private, 100MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources-library',
  'resources-library',
  false,
  104857600, -- 100MB in bytes
  ARRAY[
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Create resource-thumbnails bucket (public, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-thumbnails',
  'resource-thumbnails',
  true,
  5242880, -- 5MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================
-- Step 19: Storage RLS policies for resources-library bucket
-- ============================================

-- Storage SELECT policy: Users can only access resources they are authorized to view
CREATE POLICY resources_library_storage_select_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND EXISTS (
    SELECT 1
    FROM public.resources r
    WHERE r.file_path = storage.objects.name
    AND r.deleted_at IS NULL
    AND (
      -- Admin access
      user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
      OR (
        -- Employee access: must be published and targeted to them
        r.status = 'published'
        AND (r.published_at IS NULL OR r.published_at <= now())
        AND (r.expires_at IS NULL OR r.expires_at > now())
        AND (
          r.is_public = true OR
          (cardinality(r.target_roles) = 0) OR
          (get_user_role(auth.uid()) = ANY(r.target_roles))
        )
        AND (
          (cardinality(r.target_departments) = 0) OR
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.department_id = ANY(r.target_departments)
            AND u.deleted_at IS NULL
          )
        )
        AND (
          (cardinality(r.target_employees) = 0) OR
          (auth.uid() = ANY(r.target_employees))
        )
      )
    )
  )
);

-- Storage INSERT policy: Only admins can upload resources
CREATE POLICY resources_library_storage_insert_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources-library'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- Storage UPDATE policy: Only admins can update resources
CREATE POLICY resources_library_storage_update_policy
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
)
WITH CHECK (
  bucket_id = 'resources-library'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- Storage DELETE policy: Only admins can delete resources
CREATE POLICY resources_library_storage_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- ============================================
-- Step 20: Storage RLS policies for resource-thumbnails bucket (public read)
-- ============================================

-- Storage SELECT policy: Anyone authenticated can view thumbnails
CREATE POLICY resource_thumbnails_storage_select_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
);

-- Storage INSERT policy: Only admins can upload thumbnails
CREATE POLICY resource_thumbnails_storage_insert_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- Storage UPDATE policy: Only admins can update thumbnails
CREATE POLICY resource_thumbnails_storage_update_policy
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
)
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- Storage DELETE policy: Only admins can delete thumbnails
CREATE POLICY resource_thumbnails_storage_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos']::user_role[])
);

-- ============================================
-- Step 21: Add table comments for documentation
-- ============================================

COMMENT ON TABLE public.resources IS 'Information Hub resources including videos, documents, links, and training materials with role-based targeting';
COMMENT ON TABLE public.resource_collections IS 'Curated collections/playlists of related resources for learning paths and bundles';
COMMENT ON TABLE public.collection_resources IS 'Junction table linking resources to collections with display ordering';
COMMENT ON TABLE public.resource_bookmarks IS 'User bookmarks for quick access to favorite resources with personal notes';
COMMENT ON TABLE public.resource_views IS 'Tracks resource views for analytics, engagement metrics, and recently viewed';

COMMENT ON TYPE resource_type IS 'Type of resource: video, document, image, link, presentation, or interactive content';
COMMENT ON TYPE resource_category IS 'Category for organizing resources: onboarding, training, policies, benefits, tools, culture, department_specific, forms_templates, performance, emergency';
COMMENT ON TYPE resource_status IS 'Publishing status: draft, published, or archived';

COMMENT ON FUNCTION public.increment_resource_view_count() IS 'Trigger function to increment view_count when a resource_view is inserted';
COMMENT ON FUNCTION public.update_resource_bookmark_count() IS 'Trigger function to update bookmark_count when bookmarks are added or removed';
COMMENT ON FUNCTION public.increment_resource_download_count(uuid) IS 'Function to increment download_count when generating signed download URLs';
COMMENT ON FUNCTION public.auto_generate_resource_excerpt() IS 'Trigger function to auto-generate excerpt from description if not provided';

COMMIT;

-- ============================================
-- DOWN Migration (run manually if rollback needed)
-- ============================================
/*
BEGIN;

-- Drop storage policies
DROP POLICY IF EXISTS resource_thumbnails_storage_delete_policy ON storage.objects;
DROP POLICY IF EXISTS resource_thumbnails_storage_update_policy ON storage.objects;
DROP POLICY IF EXISTS resource_thumbnails_storage_insert_policy ON storage.objects;
DROP POLICY IF EXISTS resource_thumbnails_storage_select_policy ON storage.objects;
DROP POLICY IF EXISTS resources_library_storage_delete_policy ON storage.objects;
DROP POLICY IF EXISTS resources_library_storage_update_policy ON storage.objects;
DROP POLICY IF EXISTS resources_library_storage_insert_policy ON storage.objects;
DROP POLICY IF EXISTS resources_library_storage_select_policy ON storage.objects;

-- Drop storage buckets
DELETE FROM storage.buckets WHERE id = 'resource-thumbnails';
DELETE FROM storage.buckets WHERE id = 'resources-library';

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_resource_collections_audit ON public.resource_collections;
DROP TRIGGER IF EXISTS trigger_resources_audit ON public.resources;
DROP TRIGGER IF EXISTS trigger_resource_collections_updated_at ON public.resource_collections;
DROP TRIGGER IF EXISTS trigger_resources_updated_at ON public.resources;
DROP TRIGGER IF EXISTS resource_auto_excerpt_trigger ON public.resources;
DROP TRIGGER IF EXISTS resource_bookmark_count_trigger ON public.resource_bookmarks;
DROP TRIGGER IF EXISTS resource_view_count_trigger ON public.resource_views;

-- Drop functions
DROP FUNCTION IF EXISTS public.auto_generate_resource_excerpt();
DROP FUNCTION IF EXISTS public.increment_resource_download_count(uuid);
DROP FUNCTION IF EXISTS public.update_resource_bookmark_count();
DROP FUNCTION IF EXISTS public.increment_resource_view_count();

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.resource_views;
DROP TABLE IF EXISTS public.resource_bookmarks;
DROP TABLE IF EXISTS public.collection_resources;
DROP TABLE IF EXISTS public.resource_collections;
DROP TABLE IF EXISTS public.resources;

-- Drop enums
DROP TYPE IF EXISTS resource_status;
DROP TYPE IF EXISTS resource_category;
DROP TYPE IF EXISTS resource_type;

-- Recreate original simple resources table (if needed)
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

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_resources_category ON public.resources(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_is_public ON public.resources(is_public) WHERE deleted_at IS NULL;

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

CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_resources_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMIT;
*/
