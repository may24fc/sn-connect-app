# Resources Management

This guide covers managing company resources — documents, links, videos, and other reference materials shared with employees through the Information Hub.

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

## Archiving Resources

Archive outdated resources using the action menu. Archived resources:

- Are removed from the employee-facing Information Hub
- Remain in the admin view for reference
- Can be restored later

## Deleting Resources

Permanently remove a resource by selecting **Delete** from the action menu. This removes:

- The resource record
- The uploaded file from storage
- Any collection memberships

---

Next: [AI Knowledge Base](ai-knowledge.md) · Previous: [Announcements](announcements.md)
