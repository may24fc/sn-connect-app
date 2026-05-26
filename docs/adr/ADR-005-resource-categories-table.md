# ADR 005: Resource Categories — Enum-to-Table Migration

## Status

Accepted

## Context

Resources in the Control Hub HR Portal were originally categorized using a static PostgreSQL enum (`resource_category`). This approach had several limitations:

1. **Adding/removing categories requires a migration** — Enum changes need `ALTER TYPE`, which is costly and risky in production.
2. **No metadata** — Enums cannot carry descriptions, icons, display ordering, or parent-child relationships.
3. **No admin self-service** — Only developers with migration access could manage categories.
4. **No hierarchy** — Flat enums cannot represent nested category trees (e.g., "Policies > Company Policies > Remote Work").
5. **No soft-delete** — Removing an enum value is destructive; there is no way to deactivate and restore.

The resource library had grown to 10+ categories (Onboarding, Training, Policies, Templates, Forms, HR Documents, Company Culture, Benefits, Compliance, Tools & Software), and admins needed the ability to manage them without developer intervention.

## Decision

Replace the static `resource_category` enum with a `resource_categories` table that supports:

- **Hierarchical categories** via self-referencing `parent_id` (FK to self, ON DELETE SET NULL)
- **Admin management** via standard CRUD with RLS (admin-only INSERT/UPDATE/DELETE, all-authenticated SELECT for active categories)
- **Display ordering** via `display_order` integer column
- **Activation/deactivation** via `is_active` boolean (replacing the need for destructive enum removal)
- **Slugs** for URL-friendly identifiers (`uq_resource_categories_slug` unique constraint)
- **Icons** via `icon` text column storing Lucide icon names

### Schema

```sql
CREATE TABLE public.resource_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  parent_id uuid REFERENCES resource_categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT uq_resource_categories_name UNIQUE (name),
  CONSTRAINT uq_resource_categories_slug UNIQUE (slug)
);
```

### Data Migration

The migration seeds the 10 original enum values as rows in `resource_categories`, then backfills `resources.category_id` from the legacy `category` column. A `get_resource_category_tree()` function provides recursive category tree queries with resource counts.

### Foreign Key

A new `category_id` column (FK to `resource_categories`) is added to the `resources` table alongside the legacy `category` enum column for backward compatibility during transition.

## Consequences

### Positive

- Admins can create, reorder, deactivate, and nest categories without migrations
- Category metadata (icons, descriptions) enriches the UI
- Hierarchical browsing enables better resource organization
- `get_resource_category_tree()` function provides efficient recursive queries
- Seed data ensures zero downtime — existing resources are backfilled automatically

### Negative

- Slight query complexity increase (JOIN instead of direct enum comparison)
- Two category representations exist during transition (`category` enum + `category_id` FK)
- The legacy `category` enum column should be dropped in a future migration once all code uses `category_id`

## Alternatives

1. **Keep the enum and accept the limitations** — Rejected because admin self-service was a hard requirement.
2. **Use a JSONB column on resources** — Rejected because it prevents referential integrity and efficient indexing.
3. **Use a separate `tags` table with many-to-many** — Rejected because categories are hierarchical and singular (a resource belongs to one category), not flat and multiple.

## References

- Migration: `supabase/migrations/20260227000012_create_resource_categories_table.sql`
- ADR-002: Resources as Information Hub (original resource architecture)
- Related: `resource_access_level` enum added in `20260228000006` for view-only vs full access
