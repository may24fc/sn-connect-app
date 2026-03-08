# Collections API

> Audience: Developers

Resource collections — curated groups of resources (documents, links) that can be targeted to specific roles or departments.

**Related hooks:** `useCollections`, `useCollection`, `useCollectionResources`  
**Zod schema:** `apps/web/src/lib/schemas/resource.schema.ts`  
**Database tables:** `resource_collections`, `collection_resources`, `resources`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/collections` | Any | List collections |
| `POST` | `/api/collections` | Admin | Create collection |
| `GET` | `/api/collections/[id]` | Any | Get collection detail |
| `PATCH` | `/api/collections/[id]` | Admin | Update collection |
| `DELETE` | `/api/collections/[id]` | Admin | Soft-delete collection |
| `GET` | `/api/collections/[id]/resources` | Any | List resources in collection |
| `POST` | `/api/collections/[id]/resources` | Admin | Add resource to collection |
| `DELETE` | `/api/collections/[id]/resources?resourceId=` | Admin | Remove resource from collection |

---

## GET /api/collections

List collections with pagination and search.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search title or description |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `20` | |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Employee Handbook",
      "description": "Complete guide for new employees",
      "thumbnail_path": "collections/handbook-thumb.png",
      "is_public": true,
      "target_roles": ["employee", "intern"],
      "target_departments": [],
      "author_id": "uuid",
      "created_by": "uuid",
      "created_at": "2026-02-01T00:00:00Z",
      "updated_at": "2026-02-15T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
}
```

---

## POST /api/collections (Admin)

Create a collection.

```json
{
  "title": "Employee Handbook",
  "description": "Complete guide for new employees",
  "thumbnailPath": "collections/handbook-thumb.png",
  "isPublic": true,
  "targetRoles": ["employee", "intern"],
  "targetDepartments": []
}
```

**201 Created**

---

## PATCH /api/collections/[id] (Admin)

Partial update. Only include fields to change.

---

## DELETE /api/collections/[id] (Admin)

Soft-delete by setting `deleted_at`.

---

## GET /api/collections/[id]/resources

List resources belonging to a collection, ordered by `display_order`.

```json
{
  "data": [
    {
      "id": "resource-uuid",
      "title": "Leave Policy",
      "description": "...",
      "category": "policies",
      "file_path": "...",
      "external_url": null
    }
  ]
}
```

## POST /api/collections/[id]/resources (Admin)

Add a resource to the collection.

```json
{
  "resourceId": "resource-uuid",
  "displayOrder": 1
}
```

## DELETE /api/collections/[id]/resources?resourceId=uuid (Admin)

Remove a resource from the collection. Hard-delete from `collection_resources` junction table.

---

*Last updated: 2026-02-27*
