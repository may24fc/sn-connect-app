# Resources Management

This guide covers managing company resources — documents, links, videos, and other reference materials shared with employees through the Information Hub.

## Route Map

### Primary Admin Routes

- `/admin/resources` — Main resources dashboard
- `/admin/resources/new` — Create resource form
- `/admin/resources/[id]` — Resource detail/editor
- `/admin/resources/pending` — Pending review queue
- `/admin/resources/archive` — Archived resources
- `/admin/resources/categories` — Category management
- `/admin/resources/collections` — Collections dashboard
- `/admin/resources/collections/new` — Create collection form
- `/admin/resources/collections/[id]` — Collection detail/editor

### Super Admin Access Routes

- `/super-admin/resources` — Redirects to admin resources dashboard
- `/super-admin/resources/new` — Redirects to admin create resource form
- `/super-admin/resources/[id]` — Redirects to admin resource detail
- `/super-admin/resources/collections` — Redirects to admin collections dashboard
- `/super-admin/resources/collections/new` — Redirects to admin create collection form
- `/super-admin/resources/collections/[id]` — Redirects to admin collection detail

## Resources Dashboard (`/admin/resources` or `/super-admin/resources`)

### Browsing Resources

- **Search** by name or description
- **Category filter** — Filter by resource type (documents, links, videos, etc.)
- **Status filter** — Active, Archived
- Resources are displayed as cards or in a list view

### Resource Cards

Each resource displays:

- Resource name and description
- Category badge
- File type or link indicator
- **Featured** flag (highlighted in Information Hub)
- Upload date
- Action menu (Edit, Archive, Delete)

## Adding a Resource

Route: `/admin/resources/new` (or `/super-admin/resources/new` redirect alias)

1. Click **"Add Resource"**
2. Fill in the resource form:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Resource title |
| Description | No | Brief description of the resource |
| Category | Yes | Document, Link, Video, Template, etc. |
| File / URL | Yes | Upload a file or enter an external URL |
| Featured | No | Toggle to highlight in the Information Hub |

3. Click **Save**

### File Upload Limits

| Rule | Value |
|------|-------|
| Maximum file size | 100 MB |
| Storage bucket | `resources` |

## Managing Collections

Routes:

- `/admin/resources/collections`
- `/admin/resources/collections/new`
- `/admin/resources/collections/[id]`

Resources can be organized into **collections** — themed groups of related resources.

### Creating a Collection

1. Navigate to the collections view
2. Click **"Create Collection"**
3. Enter a name and description
4. Add resources to the collection using the resource picker
5. Click **Save**

### Collection Operations

| Action | Description |
|--------|-------------|
| Add resources | Select resources to include in the collection |
| Remove resources | Remove individual resources from the collection |
| Edit | Update the collection name or description |
| Delete | Remove the collection (resources themselves remain) |

## Featuring Resources

Toggle the **Featured** flag on a resource card to:

- Highlight it prominently in the employee Information Hub
- Give it priority placement in search results

## Archiving and Restoring Resources

Archive route: `/admin/resources/archive`

Archive outdated resources using the action menu. Archived resources:

- Are removed from the employee-facing Information Hub
- Remain in the admin view for reference (filter by **Archived** status)
- Can be restored at any time

### Restoring a Resource

1. Set the **Status** filter to **Archived**
2. Find the resource and click **Restore** from its action menu
3. The resource returns to active status and reappears in the Information Hub

`POST /api/resources/[id]/restore` — Restores an archived resource.

## Resource Categories (`/admin/resources/categories`)

Categories are now **dynamic** — managed via a dedicated admin page instead of a static enum.

### Category Tree View

Categories are displayed in a tree table with expand/collapse for parent–child hierarchy:

| Column | Description |
|--------|-------------|
| Name | Category name with icon |
| Slug | URL-friendly identifier (auto-generated) |
| Resources | Count of resources in the category |
| Actions | Edit, Delete |

### Creating a Category

1. Click **"Create Category"**
2. Fill in:
   - **Name** *(required)* — Category label
   - **Icon** — Select from available icons
   - **Parent Category** — Optional, to nest under an existing category
   - **Description** — Brief description
3. Slug is auto-generated from the name
4. Click **Save**

### Editing / Deleting Categories

Use the action menu on each row. Deleting a parent category also removes its children.

### API Reference

| Operation | Endpoint |
|-----------|----------|
| Get category tree | `GET /api/resources/categories` |
| Create category | `POST /api/resources/categories` |
| Update category | `PATCH /api/resources/categories` |
| Delete category | `DELETE /api/resources/categories?id=...` |

See [API: Resources](../api/resources.md) for full details.

## Resource Streaming

Resources can be streamed directly in the browser via `GET /api/resources/[id]/stream`. This returns the raw file bytes with the appropriate `Content-Type` header, enabling in-browser preview for PDFs, images, and other supported formats.

## Resource Detail (`/admin/resources/[id]`)

Use the resource detail page to:

- Edit title/description/metadata
- Update target visibility and featured state
- Replace file or update external URL
- Review engagement/usage details where available

## Pending Queue (`/admin/resources/pending`)

Pending resources are items requiring review before broader visibility.

Typical actions:

- Review metadata completeness
- Approve/publish to active catalog
- Archive or delete rejected items

## Deleting Resources

Permanently remove a resource by selecting **Delete** from the action menu. This removes:

- The resource record
- The uploaded file from storage
- Any collection memberships

---

*Last updated: 2026-03-26*

Next: [AI Knowledge Base](ai-knowledge.md) · Previous: [Announcements](announcements.md)
