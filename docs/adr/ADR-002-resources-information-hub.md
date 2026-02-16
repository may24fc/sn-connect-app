# ADR 002: Resources / Information Hub Architecture

## Status
Accepted

## Context
SN Connect HR Portal needs a centralized Information Hub where HR administrators can publish resources (videos, documents, links, presentations) targeted to specific roles, departments, or employees. Employees need a searchable, browsable interface to discover and consume these resources. Key design decisions involve file storage, versioning, search, content targeting, analytics tracking, RLS policy design, and frontend component architecture.

## Decision

### File Storage: Supabase Storage
Resources are stored in Supabase Storage with two buckets:
- **`resources-library`** (private, 100MB limit) -- Videos, documents, presentations, images
- **`resource-thumbnails`** (public, 5MB limit) -- Thumbnail images for resource cards

**Rationale:** Supabase Storage integrates natively with RLS policies on `storage.objects`, eliminating the need for a separate CDN authorization layer. Signed URLs (15-minute expiry) are generated server-side for downloads, ensuring access control is enforced at the data layer rather than relying on application-level checks. This aligns with the project's Zero-Trust architecture principle.

**Rejected alternative:** External CDN (CloudFront/Cloudflare R2) would require a separate authorization proxy, increasing infrastructure complexity for a feature that does not yet require global edge distribution.

### Versioning: Linked List via `previous_version_id`
The `resources` table includes a self-referential `previous_version_id uuid REFERENCES public.resources(id)` column and an integer `version` field.

**Rationale:** This approach keeps versioning in a single table with minimal schema overhead. Each new version is a full resource row linking back to its predecessor. Queries for the latest version simply check `WHERE previous_version_id IS NULL` or follow the chain. For Phase 1, resources will rarely exceed 2-3 versions, making a linked list traversal trivially efficient.

**Rejected alternative:** A separate `resource_versions` table would add join complexity and require maintaining two tables in sync. The added normalization is not justified given the expected low version count per resource.

### Search: PostgreSQL Full-Text Search
A GIN index is created on `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(tags, ' '))` with a `WHERE deleted_at IS NULL` partial index condition. The API also supports `ILIKE` pattern matching as a fallback for simple substring searches.

**Rationale:** PostgreSQL full-text search handles stemming, ranking, and multi-column search natively without external dependencies. The expected resource count (hundreds to low thousands) is well within PostgreSQL's full-text search performance envelope. No additional infrastructure cost or operational overhead is introduced.

**Rejected alternative:** Algolia or Elasticsearch would provide superior relevance ranking, typo tolerance, and faceted search, but introduce external service dependencies, additional cost, and data synchronization complexity that is unjustified at the current scale.

### Targeting System: Role/Department/Employee Arrays
Resources use three array columns for visibility targeting, reusing the pattern established by announcements:
- `target_roles user_role[]` -- Empty array means all roles
- `target_departments uuid[]` -- Empty array means all departments
- `target_employees uuid[]` -- Specific employee overrides
- `is_public boolean` -- Overrides all targeting when true

**Rationale:** This pattern is already proven in the announcements feature and understood by the team. Array containment checks (`ANY()`) are efficient with GIN indexes. The three-level targeting (role, department, individual) covers all current HR use cases without a separate permissions table.

### Analytics Tracking: Real-Time Increment via Database Triggers
View counts, bookmark counts, and download counts are incremented in real time using PostgreSQL trigger functions:
- `increment_resource_view_count()` fires `AFTER INSERT ON resource_views`
- `update_resource_bookmark_count()` fires `AFTER INSERT OR DELETE ON resource_bookmarks`
- `increment_resource_download_count(uuid)` is called explicitly from the download API route

**Rationale:** Trigger-based increments ensure counter consistency without application-level race conditions. The `SECURITY DEFINER` context allows triggers to bypass RLS for counter updates. At the expected traffic volume (tens of concurrent users), the synchronous trigger approach introduces negligible overhead compared to batch processing complexity.

**Rejected alternative:** Batch processing (queue + cron) would decouple writes from counter updates but adds infrastructure (message queue or scheduled function), eventual consistency concerns, and operational complexity inappropriate for the current user scale.

### RLS Policy Design
Five tables have RLS enabled and forced:

| Table | Employee Access | Admin Access |
|-------|----------------|--------------|
| `resources` | SELECT only published, non-expired, targeted resources | ALL operations |
| `resource_collections` | SELECT targeted collections | ALL operations |
| `collection_resources` | SELECT via parent collection access | ALL operations |
| `resource_bookmarks` | ALL on own bookmarks only | SELECT all (analytics) |
| `resource_views` | ALL on own views only | SELECT all (analytics) |

Admin roles for resource management: `admin`, `hr`, `super_admin`, `ceo`, `cos` (checked via `user_has_any_role()`).

Storage bucket policies mirror the resource table policies, with an additional join to `public.resources` to verify the requesting user has access to the resource associated with the file path.

### Component Architecture: Separated Concerns
The frontend uses separate components for distinct concerns:
- **ResourceCard** -- Individual resource display with type icon, category badge, and engagement metrics
- **ResourceGrid** -- Responsive grid layout with loading states
- **ResourceFilters** -- Category, type, and tag filter controls
- **ResourceSearch** -- Full-text search input with debouncing

**Rationale:** Separating card, grid, and filter components allows independent reuse (e.g., ResourceCard in bookmarks view, ResourceGrid in collections view) and keeps each component's responsibility narrow. This aligns with the existing UI package pattern of primitives + composites.

## Consequences

### Positive
- No external service dependencies beyond Supabase (storage, search, analytics all in-database)
- RLS policies enforce access control at the data layer, consistent with Zero-Trust principles
- Targeting system is familiar to the team from announcements feature
- Single-table versioning keeps queries simple for the expected version depth
- Trigger-based analytics eliminate application-level race conditions

### Negative
- Full-text search lacks typo tolerance and advanced relevance ranking; may need migration to external search if resource count grows beyond thousands
- Linked-list versioning becomes inefficient for deep version chains (>10 versions per resource); would require migration to a separate versions table
- Synchronous trigger-based analytics may create write contention under very high concurrent traffic
- Storage bucket RLS policies with joins to `resources` table add query overhead to every file access

## Alternatives
See individual subsections above for rejected alternatives per decision.

## References
- Migration: `supabase/migrations/20260211000002_create_resources_tables.sql`
- API routes: `apps/web/src/app/api/resources/`
- Zod schemas: `apps/web/src/lib/schemas/resource.schema.ts`
- ADR-001: Role Mapping (referenced for admin role definitions)
- CLAUDE.md: Project architecture and conventions
