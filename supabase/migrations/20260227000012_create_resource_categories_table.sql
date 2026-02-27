-- Migration: 20260227000012_create_resource_categories_table.sql
-- Description: Creates dynamic resource categories table, migrates from enum-based categories (V2-6.3)
-- Source: Admin Assistant feedback — "Category Editing + RBAC (Access Limits) for Resources."
-- Dependencies: 20260211000002_create_resources_tables.sql

BEGIN;

-- ============================================
-- 1. Create resource_categories table
-- ============================================
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text, -- lucide icon name (e.g., 'BookOpen', 'GraduationCap')
  parent_id uuid REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT uq_resource_categories_name UNIQUE (name),
  CONSTRAINT uq_resource_categories_slug UNIQUE (slug)
);

COMMENT ON TABLE public.resource_categories IS 'Dynamic resource categories, replaces the static resource_category enum';

-- ============================================
-- 2. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resource_categories_parent
  ON public.resource_categories(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_categories_slug
  ON public.resource_categories(slug);

CREATE INDEX IF NOT EXISTS idx_resource_categories_display_order
  ON public.resource_categories(display_order);

CREATE INDEX IF NOT EXISTS idx_resource_categories_active
  ON public.resource_categories(is_active)
  WHERE is_active = true;

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories FORCE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY resource_categories_read_policy
  ON public.resource_categories
  FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.deleted_at IS NULL
  ));

-- Only admins can insert categories
CREATE POLICY resource_categories_insert_policy
  ON public.resource_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- Only admins can update categories
CREATE POLICY resource_categories_update_policy
  ON public.resource_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- Only admins can delete categories
CREATE POLICY resource_categories_delete_policy
  ON public.resource_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================
-- 4. Seed with existing enum values
-- ============================================
INSERT INTO public.resource_categories (name, slug, icon, display_order, description) VALUES
  ('Onboarding', 'onboarding', 'UserPlus', 1, 'Resources for new employee onboarding'),
  ('Training', 'training', 'GraduationCap', 2, 'Training materials and courses'),
  ('Policies', 'policies', 'ScrollText', 3, 'Company policies and guidelines'),
  ('Benefits', 'benefits', 'Heart', 4, 'Employee benefits information'),
  ('Tools', 'tools', 'Wrench', 5, 'Tools and software guides'),
  ('Culture', 'culture', 'Users', 6, 'Company culture and values'),
  ('Department Specific', 'department_specific', 'Building2', 7, 'Department-specific resources'),
  ('Forms & Templates', 'forms_templates', 'FileText', 8, 'Downloadable forms and templates'),
  ('Performance', 'performance', 'TrendingUp', 9, 'Performance review resources'),
  ('Emergency', 'emergency', 'AlertTriangle', 10, 'Emergency procedures and contacts')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. Add category_id FK to resources table
-- ============================================
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.resource_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_category_id
  ON public.resources(category_id)
  WHERE category_id IS NOT NULL;

COMMENT ON COLUMN public.resources.category_id IS 'References dynamic resource_categories table. Coexists with legacy enum category column during migration.';

-- ============================================
-- 6. Backfill category_id from existing enum category
-- ============================================
UPDATE public.resources r
SET category_id = rc.id
FROM public.resource_categories rc
WHERE r.category::text = rc.slug
  AND r.category_id IS NULL;

-- ============================================
-- 7. Add access_level column to resources for granular RBAC
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_access_level') THEN
    CREATE TYPE resource_access_level AS ENUM ('full', 'view_only');
  END IF;
END
$$;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS access_level resource_access_level DEFAULT 'full';

COMMENT ON COLUMN public.resources.access_level IS 'Controls download permissions: full = view + download, view_only = view only (no download)';

CREATE INDEX IF NOT EXISTS idx_resources_access_level
  ON public.resources(access_level);

-- ============================================
-- 8. Create updated_at trigger for resource_categories
-- ============================================
CREATE OR REPLACE FUNCTION update_resource_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resource_categories_updated_at_trigger ON public.resource_categories;

CREATE TRIGGER resource_categories_updated_at_trigger
  BEFORE UPDATE ON public.resource_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_categories_updated_at();

-- ============================================
-- 9. Helper function: Get category tree
-- ============================================
CREATE OR REPLACE FUNCTION get_resource_category_tree()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  icon text,
  parent_id uuid,
  display_order integer,
  is_active boolean,
  depth integer,
  resource_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Root categories
    SELECT
      rc.id, rc.name, rc.slug, rc.description, rc.icon,
      rc.parent_id, rc.display_order, rc.is_active,
      0 AS depth
    FROM public.resource_categories rc
    WHERE rc.parent_id IS NULL

    UNION ALL

    -- Child categories
    SELECT
      child.id, child.name, child.slug, child.description, child.icon,
      child.parent_id, child.display_order, child.is_active,
      ct.depth + 1
    FROM public.resource_categories child
    INNER JOIN category_tree ct ON child.parent_id = ct.id
  )
  SELECT
    ct.id, ct.name, ct.slug, ct.description, ct.icon,
    ct.parent_id, ct.display_order, ct.is_active, ct.depth,
    COALESCE(
      (SELECT COUNT(*) FROM public.resources r
       WHERE r.category_id = ct.id AND r.deleted_at IS NULL),
      0
    ) AS resource_count
  FROM category_tree ct
  ORDER BY ct.depth, ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_resource_category_tree() IS 'Returns the full category tree with resource counts for each category';

COMMIT;
