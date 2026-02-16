# Resources API Documentation

Base path: `/api/resources`

All endpoints require authentication via Supabase Auth (JWT in cookie). Admin endpoints require one of: `admin`, `hr`, `super_admin`, `ceo`, `cos` roles.

## Table of Contents

- [List Resources (Admin)](#list-resources-admin)
- [Create Resource](#create-resource)
- [Get Resource](#get-resource)
- [Update Resource](#update-resource)
- [Delete Resource (Soft)](#delete-resource-soft)
- [Resource Feed (Employee)](#resource-feed-employee)
- [Search Resources](#search-resources)
- [Featured Resources](#featured-resources)
- [Recent Resources](#recent-resources)
- [User Bookmarks](#user-bookmarks)
- [Publish Resource](#publish-resource)
- [Archive Resource](#archive-resource)
- [Toggle Featured](#toggle-featured)
- [Track View](#track-view)
- [Bookmark Resource](#bookmark-resource)
- [Resource Analytics](#resource-analytics)
- [Upload File](#upload-file)
- [Bulk Upload](#bulk-upload)
- [Download Resource](#download-resource)
- [Error Response Format](#error-response-format)
- [Rate Limiting](#rate-limiting)

---

## List Resources (Admin)

```
GET /api/resources
```

Lists all resources with filtering and pagination. Admin only -- includes drafts and archived.

**Authentication:** Required (admin roles)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | -- | Search title and description (ILIKE) |
| `status` | `draft` \| `published` \| `archived` | -- | Filter by status |
| `category` | ResourceCategory | -- | Filter by category |
| `resourceType` | ResourceType | -- | Filter by type |
| `tags` | string (comma-separated) | -- | Filter by tags (overlap) |
| `authorId` | uuid | -- | Filter by author |
| `isFeatured` | boolean | -- | Filter featured |
| `isPinned` | boolean | -- | Filter pinned |
| `startDate` | ISO datetime | -- | Created after |
| `endDate` | ISO datetime | -- | Created before |
| `page` | integer | 1 | Page number (min: 1) |
| `pageSize` | integer | 20 | Items per page (1-100) |
| `sortBy` | `created_at` \| `published_at` \| `view_count` \| `title` | `created_at` | Sort field |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

**Response (200):**
```json
{
  "data": [Resource],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**cURL:**
```bash
curl -X GET 'https://your-app.com/api/resources?status=published&page=1&pageSize=10' \
  -H 'Cookie: sb-access-token=<JWT>'
```

**TypeScript:**
```typescript
const response = await fetch('/api/resources?status=published&category=training&page=1', {
  credentials: 'include',
});
const { data, pagination } = await response.json();
```

**Errors:** 401 Unauthorized, 403 Forbidden, 400 Invalid query parameters

---

## Create Resource

```
POST /api/resources
```

Creates a new resource in `draft` status. Admin only.

**Authentication:** Required (admin roles)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string (1-200) | Yes | Resource title |
| `description` | string (max 5000) | No | Full description |
| `excerpt` | string (max 300) | No | Short summary (auto-generated from description if omitted) |
| `resourceType` | ResourceType | Yes | `video` \| `document` \| `image` \| `link` \| `presentation` \| `interactive` |
| `category` | ResourceCategory | Yes | One of 10 categories |
| `subcategory` | string (max 100) | No | Freeform subcategory |
| `tags` | string[] (max 20 items) | No | Searchable tags |
| `filePath` | string | Conditional | Supabase Storage path (required if no `externalUrl`) |
| `externalUrl` | string (URL) | Conditional | External link (required if no `filePath`) |
| `thumbnailPath` | string | No | Thumbnail image path |
| `fileSize` | integer | No | File size in bytes |
| `mimeType` | string | No | MIME type |
| `durationSeconds` | integer | No | Video/audio duration |
| `publishedAt` | ISO datetime | No | Schedule publish date |
| `expiresAt` | ISO datetime | No | Expiration date (must be after `publishedAt`) |
| `isPublic` | boolean | No | Visible to all (default: false) |
| `targetRoles` | string[] | No | Target roles (empty = all) |
| `targetDepartments` | uuid[] | No | Target departments (empty = all) |
| `targetEmployees` | uuid[] | No | Target employees (empty = all) |
| `isFeatured` | boolean | No | Show in featured section (default: false) |
| `isPinned` | boolean | No | Pin to top (default: false) |
| `displayOrder` | integer | No | Custom order (default: 0) |

**Response (201):**
```json
{
  "data": Resource
}
```

**cURL:**
```bash
curl -X POST 'https://your-app.com/api/resources' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sb-access-token=<JWT>' \
  -d '{
    "title": "Employee Handbook 2026",
    "description": "Complete employee handbook with updated policies.",
    "resourceType": "document",
    "category": "policies",
    "filePath": "policies/1707600000_employee_handbook.pdf",
    "isPublic": true,
    "tags": ["handbook", "policies", "2026"]
  }'
```

**Errors:** 401, 403, 400 (validation: filePath or externalUrl required; expiresAt must be after publishedAt)

---

## Get Resource

```
GET /api/resources/:id
```

Get a single resource by ID. Admin only (includes drafts).

**Authentication:** Required (admin roles)

**Response (200):**
```json
{
  "data": Resource
}
```

**Errors:** 401, 403, 404 Resource not found

---

## Update Resource

```
PATCH /api/resources/:id
```

Partially update a resource. Admin only. All fields are optional.

**Authentication:** Required (admin roles)

**Request Body:** Same fields as Create, all optional. If `description` is updated and `excerpt` is not provided, excerpt is auto-regenerated.

**Response (200):**
```json
{
  "data": Resource
}
```

**Errors:** 401, 403, 400, 500

---

## Delete Resource (Soft)

```
DELETE /api/resources/:id
```

Soft-deletes a resource by setting `deleted_at`. Admin only.

**Authentication:** Required (admin roles)

**Response (200):**
```json
{
  "success": true
}
```

**Errors:** 401, 403, 500

---

## Resource Feed (Employee)

```
GET /api/resources/feed
```

Returns published, non-expired resources targeted to the current user. Available to all authenticated users. Results are filtered by RLS policies and additionally by application-level targeting checks.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | -- | Search title/description |
| `category` | ResourceCategory | -- | Filter by category |
| `resourceType` | ResourceType | -- | Filter by type |
| `tags` | string (comma-separated) | -- | Filter by tags |
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 20 | Items per page (1-50) |

**Response (200):**
```json
{
  "data": [Resource],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

Ordering: pinned first, then featured, then by `published_at` descending.

---

## Search Resources

```
GET /api/resources/search
```

Full-text search across published resources. Available to all authenticated users.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string (min 2) | Required | Search query |
| `category` | ResourceCategory | -- | Filter category |
| `resourceType` | ResourceType | -- | Filter type |
| `limit` | integer | 20 | Max results (1-50) |

**Response (200):**
```json
{
  "data": [Resource]
}
```

Results are ordered by `view_count` descending (popularity-based ranking).

---

## Featured Resources

```
GET /api/resources/featured
```

Returns up to 10 published, featured resources. Available to all authenticated users.

**Response (200):**
```json
{
  "data": [Resource]
}
```

Ordered by `display_order` ascending, then `published_at` descending.

---

## Recent Resources

```
GET /api/resources/recent
```

Returns up to 10 recently viewed resources for the current user. Available to all authenticated users.

**Response (200):**
```json
{
  "data": [Resource]
}
```

Ordered by most recently viewed.

---

## User Bookmarks

```
GET /api/resources/bookmarks
```

Returns the current user's bookmarked resources with embedded resource data. Only published resources are included.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "resource_id": "uuid",
      "user_id": "uuid",
      "notes": "Personal notes",
      "created_at": "ISO datetime",
      "resource": Resource
    }
  ]
}
```

---

## Publish Resource

```
POST /api/resources/:id/publish
```

Sets resource status to `published` and `published_at` to now. Admin only.

**Response (200):**
```json
{
  "data": Resource
}
```

---

## Archive Resource

```
POST /api/resources/:id/archive
```

Sets resource status to `archived`. Admin only.

**Response (200):**
```json
{
  "data": Resource
}
```

---

## Toggle Featured

```
POST /api/resources/:id/featured   -- Set is_featured = true
DELETE /api/resources/:id/featured  -- Set is_featured = false
```

Admin only.

**Response (200):**
```json
{
  "data": Resource
}
```

---

## Track View

```
POST /api/resources/:id/view
```

Records a view for the current user. The database trigger automatically increments `view_count` on the resource. Available to all authenticated users.

**Request Body (optional):**

| Field | Type | Description |
|-------|------|-------------|
| `durationSeconds` | integer (min 0) | Time spent viewing |
| `completed` | boolean | Whether user completed the resource |

**Response (200):**
```json
{
  "success": true
}
```

---

## Bookmark Resource

```
POST /api/resources/:id/bookmark    -- Create or update bookmark
DELETE /api/resources/:id/bookmark   -- Remove bookmark
```

Available to all authenticated users. Database triggers manage `bookmark_count`.

**POST Request Body (optional):**

| Field | Type | Description |
|-------|------|-------------|
| `notes` | string (max 500) | Personal notes |

**POST Response (201 new / 200 updated):**
```json
{
  "data": Bookmark
}
```

**DELETE Response (200):**
```json
{
  "success": true
}
```

---

## Resource Analytics

```
GET /api/resources/:id/analytics
```

Returns engagement analytics for a resource. Admin only.

**Response (200):**
```json
{
  "data": {
    "viewCount": 150,
    "downloadCount": 42,
    "bookmarkCount": 18,
    "uniqueViewers": 87,
    "avgDurationSeconds": 245,
    "completionRate": 72,
    "timeSeries": [
      { "date": "2026-01-17", "views": 5 },
      { "date": "2026-01-18", "views": 12 }
    ]
  }
}
```

Time series covers the last 30 days.

---

## Upload File

```
POST /api/resources/upload
```

Uploads a single file to Supabase Storage. Admin only. Uses `multipart/form-data`.

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload (max 100MB) |
| `category` | string | Optional folder category |

**Allowed MIME types:** `video/mp4`, `video/webm`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `image/jpeg`, `image/png`, `image/gif`

**Response (200):**
```json
{
  "data": {
    "filePath": "training/1707600000_guide.pdf",
    "fileName": "guide.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf"
  }
}
```

**Errors:** 400 (no file, invalid type, size exceeded), 401, 403, 500

---

## Bulk Upload

```
POST /api/resources/bulk-upload
```

Uploads multiple files and creates draft resource records. Admin only. Uses `multipart/form-data`.

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `files` | File[] | Files to upload |
| `metadata` | JSON string | `{ category, resourceType, isPublic, targetRoles }` |

**Response (200):**
```json
{
  "data": {
    "results": [
      { "fileName": "doc1.pdf", "success": true, "resourceId": "uuid" },
      { "fileName": "invalid.exe", "success": false, "error": "File type not allowed" }
    ],
    "summary": {
      "total": 2,
      "success": 1,
      "failed": 1
    }
  }
}
```

---

## Download Resource

```
GET /api/resources/:id/download
```

Returns a signed download URL (15-minute expiry) for file resources, or the external URL for link resources. Increments `download_count`.

**Response (200):**
```json
{
  "data": {
    "url": "https://supabase-storage.com/signed-url..."
  }
}
```

**Errors:** 400 (no downloadable file), 401, 404, 500

---

## Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": "Human-readable error message"
}
```

Validation errors include Zod flattened details:
```json
{
  "error": "Invalid request body",
  "details": {
    "fieldErrors": {
      "title": ["Title is required"]
    },
    "formErrors": ["Either a file path or external URL is required"]
  }
}
```

## Rate Limiting

Per CLAUDE.md project standards (to be implemented):
- Auth endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- File uploads: 10 requests/minute

---

## Enums Reference

**ResourceType:** `video` | `document` | `image` | `link` | `presentation` | `interactive`

**ResourceCategory:** `onboarding` | `training` | `policies` | `benefits` | `tools` | `culture` | `department_specific` | `forms_templates` | `performance` | `emergency`

**ResourceStatus:** `draft` | `published` | `archived`
