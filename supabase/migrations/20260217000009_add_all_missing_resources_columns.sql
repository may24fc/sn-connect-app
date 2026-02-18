-- Migration: Add All Missing Columns to Resources Table
-- Created: 2026-02-17
-- Description: Upgrades the basic resources table to the full schema with all required columns
--              Addresses the is_pinned column error and other missing fields

BEGIN;

-- ============================================
-- Step 0: Create missing ENUMs if they don't exist
-- ============================================

DO $$
BEGIN
  -- Create resource_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
    CREATE TYPE resource_type AS ENUM (
      'video',
      'document',
      'image',
      'link',
      'presentation',
      'interactive'
    );
    RAISE NOTICE 'Created resource_type enum';
  END IF;

  -- Create resource_category enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_category') THEN
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
    RAISE NOTICE 'Created resource_category enum';
  END IF;

  -- Create resource_status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status') THEN
    CREATE TYPE resource_status AS ENUM ('draft', 'published', 'archived');
    RAISE NOTICE 'Created resource_status enum';
  END IF;
END $$;

-- ============================================
-- Step 1: Add classification columns
-- ============================================

DO $$
BEGIN
  -- Add resource_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'resource_type'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN resource_type resource_type NOT NULL DEFAULT 'document';
    RAISE NOTICE 'Added resource_type column';
  END IF;

  -- Convert category from text to resource_category enum if needed
  -- First check if category exists and is text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'category'
    AND data_type = 'text'
  ) THEN
    -- Update category column to use enum (with safe conversion)
    -- Map existing text values to enum values
    UPDATE public.resources SET category = 
      CASE 
        WHEN category = 'onboarding' THEN 'onboarding'
        WHEN category = 'training' THEN 'training'
        WHEN category = 'policies' THEN 'policies'
        WHEN category = 'benefits' THEN 'benefits'
        WHEN category = 'tools' THEN 'tools'
        WHEN category = 'culture' THEN 'culture'
        WHEN category = 'department_specific' THEN 'department_specific'
        WHEN category = 'forms_templates' THEN 'forms_templates'
        WHEN category = 'performance' THEN 'performance'
        WHEN category = 'emergency' THEN 'emergency'
        ELSE 'tools' -- default for any unmapped values
      END;
    
    -- Now alter the column type to the enum
    ALTER TABLE public.resources ALTER COLUMN category TYPE resource_category USING category::resource_category;
    RAISE NOTICE 'Converted category column to resource_category enum';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'category'
  ) THEN
    -- Category column doesn't exist at all, add it
    ALTER TABLE public.resources ADD COLUMN category resource_category NOT NULL DEFAULT 'tools';
    RAISE NOTICE 'Added category column';
  END IF;

  -- Add subcategory column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN subcategory text;
    RAISE NOTICE 'Added subcategory column';
  END IF;

  -- Add tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN tags text[] DEFAULT '{}';
    RAISE NOTICE 'Added tags column';
  END IF;
END $$;

-- ============================================
-- Step 2: Add content metadata columns
-- ============================================

DO $$
BEGIN
  -- Add thumbnail_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'thumbnail_path'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN thumbnail_path text;
    RAISE NOTICE 'Added thumbnail_path column';
  END IF;

  -- Add file_size column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN file_size bigint;
    RAISE NOTICE 'Added file_size column';
  END IF;

  -- Add mime_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN mime_type text;
    RAISE NOTICE 'Added mime_type column';
  END IF;

  -- Add duration_seconds column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN duration_seconds integer;
    RAISE NOTICE 'Added duration_seconds column';
  END IF;
END $$;

-- ============================================
-- Step 3: Add publishing/status columns
-- ============================================

DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN status resource_status NOT NULL DEFAULT 'draft';
    RAISE NOTICE 'Added status column';
  END IF;
END $$;

-- published_at and expires_at should already exist from previous migrations
-- But we'll add them if needed for safety

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN published_at timestamptz;
    RAISE NOTICE 'Added published_at column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN expires_at timestamptz;
    RAISE NOTICE 'Added expires_at column';
  END IF;
END $$;

-- ============================================
-- Step 4: Add targeting columns
-- ============================================

DO $$
BEGIN
  -- Add target_departments column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'target_departments'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN target_departments uuid[] DEFAULT '{}';
    RAISE NOTICE 'Added target_departments column';
  END IF;

  -- Add target_employees column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'target_employees'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN target_employees uuid[] DEFAULT '{}';
    RAISE NOTICE 'Added target_employees column';
  END IF;
END $$;

-- ============================================
-- Step 5: Add display option columns (including is_pinned)
-- ============================================

DO $$
BEGIN
  -- Add is_featured column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN is_featured boolean DEFAULT false;
    RAISE NOTICE 'Added is_featured column';
  END IF;

  -- Add is_pinned column (THE MAIN FIX)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN is_pinned boolean DEFAULT false;
    RAISE NOTICE 'Added is_pinned column';
  END IF;

  -- Add display_order column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN display_order integer DEFAULT 0;
    RAISE NOTICE 'Added display_order column';
  END IF;
END $$;

-- ============================================
-- Step 6: Add engagement metrics columns
-- ============================================

DO $$
BEGIN
  -- Add view_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN view_count integer DEFAULT 0;
    RAISE NOTICE 'Added view_count column';
  END IF;

  -- Add download_count column (note: different from old downloads_count)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'download_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN download_count integer DEFAULT 0;
    RAISE NOTICE 'Added download_count column';
    
    -- Migrate data from old downloads_count if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'downloads_count'
    ) THEN
      UPDATE public.resources SET download_count = downloads_count WHERE downloads_count IS NOT NULL;
      RAISE NOTICE 'Migrated data from downloads_count to download_count';
    END IF;
  END IF;

  -- Add bookmark_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'bookmark_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN bookmark_count integer DEFAULT 0;
    RAISE NOTICE 'Added bookmark_count column';
  END IF;
END $$;

-- ============================================
-- Step 7: Add versioning columns
-- ============================================

DO $$
BEGIN
  -- Add version column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN version integer DEFAULT 1;
    RAISE NOTICE 'Added version column';
  END IF;

  -- Add previous_version_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'previous_version_id'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN previous_version_id uuid REFERENCES public.resources(id);
    RAISE NOTICE 'Added previous_version_id column';
  END IF;
END $$;

-- ============================================
-- Step 8: Add author_id column
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'author_id'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE public.resources ADD COLUMN author_id uuid REFERENCES public.users(id);
    RAISE NOTICE 'Added author_id column';
    
    -- Backfill with created_by where available
    UPDATE public.resources SET author_id = created_by WHERE created_by IS NOT NULL AND author_id IS NULL;
    
    -- Make NOT NULL and add default for future inserts
    ALTER TABLE public.resources ALTER COLUMN author_id SET NOT NULL;
    RAISE NOTICE 'Backfilled author_id and set NOT NULL';
  END IF;
END $$;

-- ============================================
-- Step 9: Create indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_resources_is_pinned ON public.resources(is_pinned) WHERE deleted_at IS NULL AND is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_resources_is_featured ON public.resources(is_featured) WHERE deleted_at IS NULL AND is_featured = true;
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_published_at ON public.resources(published_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_author_id ON public.resources(author_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_tags ON public.resources USING gin(tags);

-- ============================================
-- Step 10: Add column comments for documentation
-- ============================================

COMMENT ON COLUMN public.resources.resource_type IS 'Type of resource: document, video, link, training, policy, form, checklist';
COMMENT ON COLUMN public.resources.subcategory IS 'Freeform subcategory within main category';
COMMENT ON COLUMN public.resources.tags IS 'Searchable tags (e.g., [''remote-work'', ''productivity''])';
COMMENT ON COLUMN public.resources.thumbnail_path IS 'Thumbnail image for videos/documents';
COMMENT ON COLUMN public.resources.file_size IS 'Size in bytes for uploaded files';
COMMENT ON COLUMN public.resources.mime_type IS 'MIME type (e.g., ''video/mp4'', ''application/pdf'')';
COMMENT ON COLUMN public.resources.duration_seconds IS 'Video/audio duration in seconds';
COMMENT ON COLUMN public.resources.status IS 'Publishing status: draft, published, archived';
COMMENT ON COLUMN public.resources.published_at IS 'Publication timestamp (NULL = draft, future = scheduled, past = published)';
COMMENT ON COLUMN public.resources.expires_at IS 'Expiration timestamp (NULL = never expires)';
COMMENT ON COLUMN public.resources.target_departments IS 'Target departments (empty = all departments)';
COMMENT ON COLUMN public.resources.target_employees IS 'Target specific employees (overrides role/department)';
COMMENT ON COLUMN public.resources.is_featured IS 'Show in featured section';
COMMENT ON COLUMN public.resources.is_pinned IS 'Pin to top of category';
COMMENT ON COLUMN public.resources.display_order IS 'Custom ordering within category';
COMMENT ON COLUMN public.resources.view_count IS 'Number of views';
COMMENT ON COLUMN public.resources.download_count IS 'Number of downloads';
COMMENT ON COLUMN public.resources.bookmark_count IS 'Number of bookmarks';
COMMENT ON COLUMN public.resources.version IS 'Version number (increments on update)';
COMMENT ON COLUMN public.resources.previous_version_id IS 'Link to previous version';
COMMENT ON COLUMN public.resources.author_id IS 'User who created the resource';

COMMIT;
