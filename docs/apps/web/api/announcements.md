# Announcements API

> Audience: Developers

Company-wide announcement management with targeting, comments, attachments, read tracking, and analytics. Uses a **draft → published → archived** lifecycle. Admin endpoints manage announcements; the feed endpoint serves published announcements to all authenticated users.

**Related hooks:** `useAnnouncements`, `useAnnouncementFeed`, `useCreateAnnouncement`, `useAnnouncementAnalytics`  
**Zod schema:** `apps/web/src/lib/schemas/announcement.schema.ts`  
**Database tables:** `announcements`, `announcement_reads`, `announcement_comments`, `announcement_attachments`  
**Storage bucket:** `announcement-attachments`

---

## Endpoints

### Admin Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/announcements` | Admin | List all announcements |
| `POST` | `/api/announcements` | Admin | Create announcement |
| `GET` | `/api/announcements/[id]` | Admin | Get announcement detail |
| `PATCH` | `/api/announcements/[id]` | Admin | Update announcement |
| `DELETE` | `/api/announcements/[id]` | Admin | Soft-delete announcement |
| `POST` | `/api/announcements/[id]/publish` | Admin | Publish a draft |
| `POST` | `/api/announcements/[id]/archive` | Admin | Archive an announcement |
| `POST` | `/api/announcements/[id]/pin` | Admin | Pin announcement |
| `DELETE` | `/api/announcements/[id]/pin` | Admin | Unpin announcement |
| `GET` | `/api/announcements/[id]/analytics` | Admin | Read analytics |
| `GET` | `/api/announcements/[id]/attachments` | Any | List attachments |
| `POST` | `/api/announcements/[id]/attachments` | Admin | Upload attachment |
| `DELETE` | `/api/announcements/[id]/attachments/[attachmentId]` | Admin | Delete attachment |

### Employee Feed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/announcements/feed` | Any | Published announcements feed |
| `POST` | `/api/announcements/[id]/read` | Any | Mark as read |
| `GET` | `/api/announcements/[id]/comments` | Any | List comments |
| `POST` | `/api/announcements/[id]/comments` | Any | Add comment |

---

## GET /api/announcements (Admin)

List all announcements with filters and pagination. Sorted by pinned first, then newest.

### Query Parameters (Zod: `announcementFiltersSchema`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search title or content |
| `status` | `enum` | — | `draft`, `scheduled`, `published`, `expired`, `archived` |
| `category` | `enum` | — | See category values below |
| `priority` | `enum` | — | `low`, `normal`, `high`, `urgent` |
| `authorId` | `uuid` | — | Filter by author |
| `startDate` | `datetime` | — | Created after (ISO 8601) |
| `endDate` | `datetime` | — | Created before (ISO 8601) |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `10` | Max 100 |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Company Outing 2026",
      "content": "We're going to Boracay...",
      "excerpt": "We're going to Boracay for our annual...",
      "category": "events",
      "priority": "normal",
      "status": "published",
      "is_pinned": true,
      "allow_comments": true,
      "has_attachments": false,
      "read_count": 42,
      "author_id": "uuid",
      "target_roles": ["employee", "associate"],
      "target_departments": [],
      "target_employees": [],
      "published_at": "2026-02-27T10:00:00Z",
      "expires_at": null,
      "created_at": "2026-02-26T15:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 25, "totalPages": 3 }
}
```

---

## POST /api/announcements (Admin)

Create a new announcement.

### Request Body (Zod: `createAnnouncementSchema`)

```json
{
  "title": "Company Outing 2026",
  "content": "We're going to Boracay for our annual company outing...",
  "excerpt": null,
  "category": "events",
  "priority": "normal",
  "status": "draft",
  "publishedAt": null,
  "expiresAt": null,
  "targetRoles": ["employee", "associate"],
  "targetDepartments": [],
  "targetEmployees": [],
  "isPinned": false,
  "allowComments": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Min 1 char |
| `content` | `string` | Yes | — | Min 1 char (supports rich text) |
| `excerpt` | `string` | No | Auto-generated | Max 200 chars. Auto-derived from content if null |
| `category` | `enum` | No | `general` | See enum values below |
| `priority` | `enum` | No | `normal` | `low`, `normal`, `high`, `urgent` |
| `status` | `enum` | No | `draft` | `draft`, `scheduled`, `published`, `expired`, `archived` |
| `publishedAt` | `datetime` | No | `null` | ISO 8601 with offset |
| `expiresAt` | `datetime` | No | `null` | Must be after `publishedAt` |
| `targetRoles` | `string[]` | No | `[]` | `employee`, `associate`, `admin`, `super_admin` |
| `targetDepartments` | `string[]` | No | `[]` | Department IDs |
| `targetEmployees` | `string[]` | No | `[]` | Employee IDs |
| `isPinned` | `boolean` | No | `false` | Pin to top of feed |
| `allowComments` | `boolean` | No | `false` | Enable commenting |

### Categories

`hr_updates`, `benefits`, `events`, `performance`, `training`, `policy`, `general`, `emergency`

### Validation

- If both `publishedAt` and `expiresAt` are set, `expiresAt` must be after `publishedAt`

### Response

**201 Created** — returns full announcement object.

---

## PATCH /api/announcements/[id] (Admin)

Update announcement fields. Partial updates — only include changed fields.

Uses Zod `updateAnnouncementSchema` (all fields optional). Excerpt is auto-regenerated when `content` changes.

---

## DELETE /api/announcements/[id] (Admin)

Soft-delete by setting `deleted_at`.

```json
{ "success": true }
```

---

## POST /api/announcements/[id]/publish (Admin)

Publish a draft announcement. Sets `status` to `published` and `published_at` to now.

---

## POST /api/announcements/[id]/archive (Admin)

Archive an announcement. Sets `status` to `archived`.

---

## POST /api/announcements/[id]/pin (Admin)

Pin an announcement to the top of the feed (`is_pinned = true`).

## DELETE /api/announcements/[id]/pin (Admin)

Unpin an announcement (`is_pinned = false`).

---

## GET /api/announcements/feed

Published announcements feed for all authenticated users. Sorted by pinned first, then newest `published_at`. Enriched with read status per user.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search title or content |
| `category` | `enum` | — | Filter by category |
| `readStatus` | `enum` | — | `all`, `read`, `unread` |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `10` | |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Company Outing 2026",
      "content": "...",
      "is_pinned": true,
      "is_read": false,
      "published_at": "2026-02-27T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 12, "totalPages": 2 }
}
```

The `is_read` field is computed per-user by joining `announcement_reads`.

---

## POST /api/announcements/[id]/read

Mark an announcement as read. Upserts on `(announcement_id, user_id)`.

**201 Created** — returns the read record with `read_at` timestamp.

---

## GET /api/announcements/[id]/comments

List comments on an announcement, ordered by `created_at` ascending.

```json
{
  "data": [
    {
      "id": "uuid",
      "announcement_id": "uuid",
      "user_id": "uuid",
      "content": "Looking forward to it!",
      "created_at": "2026-02-27T12:00:00Z"
    }
  ]
}
```

## POST /api/announcements/[id]/comments

Add a comment. Requires `allowComments` to be enabled on the announcement (enforced at UI level).

```json
{ "content": "Looking forward to it!" }
```

**201 Created**

---

## Attachments

### GET /api/announcements/[id]/attachments

List attachments. Any authenticated user can view.

### POST /api/announcements/[id]/attachments (Admin)

Upload a file attachment. Uses `multipart/form-data`.

| Field | Type | Required |
|-------|------|----------|
| `file` | `File` | Yes |

**Constraints:** Same as onboarding documents — 10 MB max, JPEG/PNG/GIF/PDF/DOC/DOCX.

**Storage path:** `announcement-attachments/{announcement_id}/{uuid}-{filename}`

After upload, sets `has_attachments = true` on the announcement.

### DELETE /api/announcements/[id]/attachments/[attachmentId] (Admin)

Hard-deletes the attachment record and removes the file from storage. If no attachments remain, sets `has_attachments = false`.

---

## GET /api/announcements/[id]/analytics (Admin)

Read analytics for an announcement — total reads, unique readers, daily time series.

### Response

```json
{
  "data": {
    "announcement": {
      "id": "uuid",
      "title": "Company Outing 2026",
      "status": "published",
      "read_count": 42,
      "published_at": "2026-02-27T10:00:00Z"
    },
    "readCount": 42,
    "uniqueReaders": 38,
    "timeSeries": [
      { "date": "2026-02-27", "count": 30 },
      { "date": "2026-02-28", "count": 12 }
    ],
    "reads": [
      { "id": "uuid", "user_id": "uuid", "read_at": "2026-02-27T10:05:00Z" }
    ]
  }
}
```

---

## Announcement Lifecycle

```
draft → published → archived
      → scheduled → published (future: auto-publish at publishedAt)
                  → expired (future: auto-expire at expiresAt)
```

---

*Last updated: 2026-02-27*
