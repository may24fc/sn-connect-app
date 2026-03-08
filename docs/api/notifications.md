# Notifications API

> Audience: Developers

In-app notification system with deep-link support, read tracking, and expiry. Notifications are created server-side (by Edge Functions, API routes, and admin actions) and consumed by authenticated users via the endpoints below.

**Related hooks:** `useNotifications`
**Database table:** `notifications`
**Enum:** `notification_type` (11 values)
**RLS:** Users can only read/update/delete their own notifications; admins can read all.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | Any | List notifications for current user |
| `PATCH` | `/api/notifications` | Any | Mark a single notification as read |
| `POST` | `/api/notifications` | Any | Mark all notifications as read |
| `DELETE` | `/api/notifications?id={uuid}` | Any | Delete a notification |

---

## GET /api/notifications

List notifications for the current authenticated user with pagination, filtering by read status and type. Also returns the total unread count.

### Query Parameters (Zod: `listQuerySchema`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number (1-indexed) |
| `pageSize` | `number` | `20` | Results per page (1–100) |
| `isRead` | `'true' \| 'false' \| 'all'` | `'all'` | Filter by read status |
| `type` | `string` | — | Filter by `notification_type` value |

### Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "task_assigned",
      "title": "New task assigned",
      "message": "You have been assigned to 'Q1 Report'",
      "link": "/tasks/abc-123",
      "is_read": false,
      "read_at": null,
      "metadata": {},
      "created_at": "2026-02-27T10:00:00Z",
      "expires_at": null
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400` | Invalid query parameters (Zod validation error) |
| `401` | Not authenticated |
| `500` | Internal server error |

---

## PATCH /api/notifications

Mark a single notification as read.

### Request Body (Zod: `markReadSchema`)

```json
{
  "id": "uuid"
}
```

### Response — `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "is_read": true,
    "read_at": "2026-02-27T10:05:00Z"
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400` | Invalid request body (missing or invalid UUID) |
| `401` | Not authenticated |
| `500` | Failed to update |

---

## POST /api/notifications

Mark **all** unread notifications as read for the current user.

### Request Body

None required.

### Response — `200 OK`

```json
{
  "success": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401` | Not authenticated |
| `500` | Failed to update |

---

## DELETE /api/notifications?id={uuid}

Permanently delete a notification belonging to the current user.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `uuid` | Yes | Notification ID |

### Response — `200 OK`

```json
{
  "success": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400` | Missing or invalid notification ID |
| `401` | Not authenticated |
| `500` | Failed to delete |

---

## Notification Types

| Type | Created By | Description |
|------|-----------|-------------|
| `task_assigned` | Task API | User was assigned to a task |
| `task_due` | Edge Function (probation-check) | Task is approaching due date |
| `report_submitted` | Reports API | Report was submitted for review |
| `report_approved` | Reports API | Report was approved |
| `report_rejected` | Reports API | Report was rejected |
| `announcement_new` | Announcements API | New announcement published |
| `resource_new` | Resources API | New resource added |
| `reminder` | Admin / Cron | General reminder |
| `onboarding_step` | Edge Function (onboarding) | Onboarding milestone reached |
| `probation_update` | Edge Function (probation-check) | Probation milestone approaching |
| `system` | System | System-generated notification |

---

## RLS Policies

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `notifications_select_own_policy` | SELECT | `user_id = auth.uid()` |
| `notifications_update_own_policy` | UPDATE | `user_id = auth.uid()` |
| `notifications_delete_own_policy` | DELETE | `user_id = auth.uid()` |
| `notifications_insert_policy` | INSERT | Any authenticated (`WITH CHECK true`) |
| `notifications_admin_select_policy` | SELECT | Admin/super_admin (for analytics) |

---

## Integration Example

```typescript
// Mark a notification as read
const response = await fetch('/api/notifications', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ id: notificationId }),
});

// Get unread notifications
const { data, unreadCount } = await fetch(
  '/api/notifications?isRead=false&pageSize=10'
).then(r => r.json());
```

---

## Creating Notifications (Server-Side)

Notifications are typically created by other API routes or Edge Functions, not directly by users:

```typescript
import { createNotification } from '@/lib/notifications/create';

await createNotification(supabase, {
  user_id: targetUserId,
  type: 'task_assigned',
  title: 'New task assigned',
  message: `You have been assigned to "${taskTitle}"`,
  link: `/tasks/${taskId}`,
});
```

---

*See also: [API Index](README.md) · [Database Schema](../architecture/database.md)*
