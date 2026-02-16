# Resources Table Schema Fix - 2026-02-16

## Problem Statement

Multiple PostgreSQL 42703 errors (`column does not exist`) were occurring in resources API endpoints:

### Error 1: `expires_at` column missing
**Affected Endpoints:**
- `GET /api/resources/featured` (line 19)
- `GET /api/resources/feed` (line 51)

**Error Message:**
```
column resources.expires_at does not exist
```

### Error 2: `excerpt` column missing
**Affected Endpoints:**
- `GET /api/resources/bookmarks` (line 25)

**Error Message:**
```
column resources_1.excerpt does not exist
```

## Root Cause Analysis

The original migration `20260211000002_create_resources_tables.sql` defined both columns:
- **Line 59:** `excerpt text` - Short summary (auto-generated from first 200 chars if null)
- **Line 80:** `expires_at timestamptz` - Null = never expires

However, a later repair migration `20260216000015_verify_and_repair_schema.sql` only checked for `published_at` and did not verify or add `expires_at` or `excerpt` columns. This indicates the full resources table schema was never applied to the database.

## Solution Implemented

### Migration: `20260216000017_add_missing_resources_columns.sql`

This migration adds the missing columns with proper safeguards:

#### 1. Added `expires_at` column
```sql
ALTER TABLE public.resources ADD COLUMN expires_at TIMESTAMPTZ;
```
- **Type:** `TIMESTAMPTZ` (timestamp with time zone - best practice)
- **Nullable:** `NULL` = never expires
- **Purpose:** Allow resources to be automatically unpublished after a certain date

#### 2. Added `excerpt` column
```sql
ALTER TABLE public.resources ADD COLUMN excerpt TEXT;
```
- **Type:** `TEXT` (PostgreSQL best practice over VARCHAR)
- **Nullable:** Yes (auto-generated from description if null)
- **Purpose:** Short summary for resource cards and listings

#### 3. Backfilled existing data
```sql
UPDATE public.resources
SET excerpt = CASE
  WHEN length(description) > 200 THEN left(description, 200) || '...'
  ELSE description
END
WHERE excerpt IS NULL AND description IS NOT NULL;
```
- Auto-generates excerpts for existing resources
- Matches the behavior of the `auto_generate_resource_excerpt()` trigger

## Migration Execution

```bash
pnpm db:migrate
```

**Status:** ✅ Successfully applied on 2026-02-16

**Output:**
```
Applying migration 20260216000017_add_missing_resources_columns.sql...
Finished supabase db push.
```

## Verification Steps

### 1. Check columns exist in database
Run this query in Supabase SQL Editor:

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resources'
  AND column_name IN ('expires_at', 'excerpt', 'published_at')
ORDER BY column_name;
```

**Expected Output:**
| column_name  | data_type                   | is_nullable | column_default |
|--------------|-----------------------------| ------------|----------------|
| excerpt      | text                        | YES         | NULL           |
| expires_at   | timestamp with time zone    | YES         | NULL           |
| published_at | timestamp with time zone    | YES         | NULL           |

### 2. Test API endpoints
Execute these requests to verify the fix:

```bash
# Test featured resources
curl -X GET "https://your-app.com/api/resources/featured" \
  -H "Authorization: Bearer YOUR_JWT"

# Test feed
curl -X GET "https://your-app.com/api/resources/feed?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_JWT"

# Test bookmarks
curl -X GET "https://your-app.com/api/resources/bookmarks" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Expected:** All requests should return `200 OK` without column errors.

### 3. Regenerate TypeScript types
After verification, regenerate types from the updated schema:

```bash
pnpm db:generate
```

## Files Modified

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/20260216000017_add_missing_resources_columns.sql` | Migration | Adds missing columns to resources table |
| `supabase/migrations/verify_resources_schema.sql` | Verification | SQL query to verify the fix |
| `docs/fix-resources-schema-2026-02-16.md` | Documentation | This document |

## API Endpoint Analysis

### `/api/resources/featured/route.ts`
**Query Pattern:**
```typescript
.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
```
- Filters for resources that either never expire OR have not expired yet
- **Status:** ✅ Fixed by adding `expires_at` column

### `/api/resources/feed/route.ts`
**Query Pattern:**
```typescript
.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
```
- Same pattern as featured endpoint
- **Status:** ✅ Fixed by adding `expires_at` column

### `/api/resources/bookmarks/route.ts`
**Query Pattern:**
```typescript
resource:resources (
  id,
  title,
  description,
  excerpt,  // <-- Was missing
  resource_type,
  ...
)
```
- Selects resource data including excerpt for bookmark listings
- **Status:** ✅ Fixed by adding `excerpt` column

## Best Practices Applied

### 1. Idempotent Migration
Uses `IF NOT EXISTS` checks to safely re-run migration:
```sql
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'resources' AND column_name = 'expires_at'
) THEN
  ALTER TABLE public.resources ADD COLUMN expires_at TIMESTAMPTZ;
END IF;
```

### 2. Data Type Standards
- ✅ `TIMESTAMPTZ` (not `TIMESTAMP`) - includes time zone
- ✅ `TEXT` (not `VARCHAR`) - PostgreSQL best practice
- ✅ Nullable by default - allows optional columns

### 3. Data Backfill
- Auto-generates excerpts for existing resources
- Prevents null excerpts in UI
- Matches trigger behavior for consistency

### 4. Documentation
- Added column comments for future developers
- Clear purpose and behavior documented in SQL

## Future Recommendations

### 1. Schema Validation Tests
Add E2E tests to verify all expected columns exist:

```typescript
// tests/db/schema-validation.test.ts
describe('Resources Table Schema', () => {
  it('should have all required columns', async () => {
    const { data } = await supabase
      .from('resources')
      .select('id, title, description, excerpt, expires_at, published_at')
      .limit(1);

    expect(data).toBeDefined();
  });
});
```

### 2. Migration Dependency Graph
Document which migrations depend on each other:
```
20260211000002_create_resources_tables.sql (FULL SCHEMA)
  ├─ Creates: resources, resource_collections, resource_bookmarks, resource_views
  ├─ Defines: excerpt, expires_at, published_at columns
  └─ Dependencies: user_role enum, helper functions

20260216000015_verify_and_repair_schema.sql (PARTIAL REPAIR)
  ├─ Adds: published_at column ONLY
  └─ Missing: expires_at, excerpt columns

20260216000017_add_missing_resources_columns.sql (COMPLETE REPAIR)
  ├─ Adds: expires_at, excerpt columns
  └─ Backfills: excerpt from description
```

### 3. TypeScript Type Safety
Ensure database types are regenerated after schema changes:

```bash
# Add to CI/CD pipeline
pnpm db:migrate
pnpm db:generate  # Regenerate types
pnpm typecheck    # Verify no type errors
```

### 4. API Query Validation
Add runtime validation to catch missing columns early:

```typescript
// apps/web/src/lib/db-validation.ts
import { z } from 'zod';

export const resourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  excerpt: z.string().nullable(),  // Validate excerpt exists
  expires_at: z.string().nullable(), // Validate expires_at exists
  published_at: z.string().nullable(),
  // ... other fields
});
```

## Security Considerations

### RLS Policies
The existing RLS policies in `20260211000002_create_resources_tables.sql` already handle `expires_at`:

```sql
-- Lines 237-239
AND (published_at IS NULL OR published_at <= now())
AND (expires_at IS NULL OR expires_at > now())
```

**This ensures:**
- ✅ Expired resources are automatically hidden from employees
- ✅ Admin/HR can still view expired resources
- ✅ No application-level filtering needed (RLS handles it)

## Rollback Instructions

If this migration needs to be rolled back:

```sql
BEGIN;

-- Remove columns
ALTER TABLE public.resources DROP COLUMN IF EXISTS expires_at;
ALTER TABLE public.resources DROP COLUMN IF EXISTS excerpt;

COMMIT;
```

**WARNING:** This will delete all excerpt and expiration data. Only rollback if absolutely necessary.

## Related Issues

- **Original Issue:** PostgreSQL 42703 errors in resources API
- **Related Migrations:**
  - `20260211000002_create_resources_tables.sql` - Original schema definition
  - `20260216000015_verify_and_repair_schema.sql` - Partial repair (published_at only)
  - `20260216000017_add_missing_resources_columns.sql` - Complete repair (this fix)

## Conclusion

The resources table now has all required columns for the Information Hub feature:
- ✅ `excerpt` - For resource summaries in listings
- ✅ `expires_at` - For auto-expiring resources (announcements, time-sensitive content)
- ✅ `published_at` - For scheduled publishing

All API endpoints should now work without column errors.

**Next Steps:**
1. Test all resources endpoints in development
2. Regenerate TypeScript types (`pnpm db:generate`)
3. Deploy to production
4. Monitor for any remaining schema issues
