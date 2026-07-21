# Tasks API

> Audience: Developers

Task management with assignment, status tracking, and comments. Tasks are assigned by super admins and can be tracked by all authenticated users.

**Related hooks:** `useTasks`, `useTask`, `useCreateTask`, `useUpdateTask`, `useTaskAssignees`, `useTasksRealtime`  
**Zod schema:** `apps/web/src/lib/schemas/task.schema.ts`  
**Database table:** `tasks`, `task_comments`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tasks` | Any authenticated | List tasks with filters |
| `POST` | `/api/tasks` | super_admin | Create and assign a task |
| `GET` | `/api/tasks/[id]` | Any authenticated | Get task detail |
| `PATCH` | `/api/tasks/[id]` | Any (reassign: super_admin) | Update task fields |
| `DELETE` | `/api/tasks/[id]` | Any authenticated | Soft-delete a task |
| `GET` | `/api/tasks/assignees` | super_admin | List eligible assignees |
| `GET` | `/api/tasks/[id]/comments` | Any authenticated | List task comments |
| `POST` | `/api/tasks/[id]/comments` | Any authenticated | Create a comment |

---

## GET /api/tasks

List tasks with filters and pagination. Results include resolved assignee and assigner names.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | `""` | Search by title or description |
| `status` | `string` | — | `pending`, `in_progress`, `completed`, `cancelled` |
| `priority` | `string` | — | `low`, `medium`, `high`, `urgent` |
| `assigneeId` | `uuid` | — | Filter by assigned user |
| `page` | `number` | `1` | Page number |
| `pageSize` | `number` | `10` | Results per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Complete weekly report",
      "description": "Submit your weekly report by Friday",
      "assigned_to": "uuid",
      "assigned_by": "uuid",
      "priority": "medium",
      "status": "pending",
      "due_date": "2026-03-01",
      "completed_at": null,
      "created_at": "2026-02-27T10:00:00Z",
      "updated_at": "2026-02-27T10:00:00Z",
      "assignee_name": "Juan Dela Cruz",
      "assigner_name": "Maria Santos"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

Names are resolved by joining `employees` table on `user_id` matching `assigned_to`/`assigned_by`.

### Example

```bash
curl -X GET "https://your-app.com/api/tasks?status=pending&priority=high&page=1" \
  -H "Cookie: sb-access-token=..."
```

---

## POST /api/tasks

Create a new task and optionally assign it.

### Authentication

Requires `super_admin` role (`TASK_ASSIGNER_ROLE`).

### Request Body (Zod: `taskCreateSchema`)

```json
{
  "title": "Complete weekly report",
  "description": "Submit your weekly report by Friday",
  "assignedTo": "uuid | null",
  "priority": "medium",
  "status": "pending",
  "dueDate": "2026-03-01"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Min 1 character |
| `description` | `string` | No | `null` | Task description |
| `assignedTo` | `uuid` | No | `null` | Assignee user ID (validated as employee/associate) |
| `priority` | `enum` | No | `"medium"` | `low`, `medium`, `high`, `urgent` |
| `status` | `enum` | No | `"pending"` | `pending`, `in_progress`, `completed`, `cancelled` |
| `dueDate` | `string` | No | `null` | Due date (any string format) |

### Validation

- `title` must be non-empty
- `assignedTo` is validated against employees table — must be a valid `user_id` with a non-deleted employee record
- Zod validates all fields before database insert

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "title": "Complete weekly report",
    "assigned_to": "uuid",
    "assigned_by": "current-user-uuid",
    "priority": "medium",
    "status": "pending",
    "created_at": "2026-02-27T10:00:00Z"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Zod validation errors | Invalid input |
| `400` | `Assignee not found...` | `assignedTo` user has no employee record |
| `401` | `Unauthorized` | No valid session |
| `403` | `Only super_admin can create tasks` | Insufficient role |
| `500` | `Failed to create task` | Database error |

---

## GET /api/tasks/[id]

Get a single task with resolved assignee/assigner names.

### Response

```json
{
  "data": {
    "id": "uuid",
    "title": "Complete weekly report",
    "description": "...",
    "assigned_to": "uuid",
    "assigned_by": "uuid",
    "priority": "medium",
    "status": "pending",
    "due_date": "2026-03-01",
    "completed_at": null,
    "created_at": "2026-02-27T10:00:00Z",
    "updated_at": "2026-02-27T10:00:00Z",
    "assignee_name": "Juan Dela Cruz",
    "assigner_name": "Maria Santos"
  }
}
```

---

## PATCH /api/tasks/[id]

Update task fields. Re-assigning (`assignedTo`) requires `super_admin` role; updating other fields (e.g., `status`) is allowed for any authenticated user.

### Request Body (Zod: `taskUpdateSchema`)

Partial — only include fields to update:

```json
{
  "status": "completed",
  "priority": "high"
}
```

### Behavior

- When `status` is set to `"completed"`, `completed_at` is automatically set to `now()`
- When `assignedTo` changes, the server validates the new assignee is a valid employee

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Zod validation errors | Invalid input |
| `403` | `Only super_admin can reassign tasks` | Non-admin tried to change `assignedTo` |
| `404` | `Task not found` | ID not found or soft-deleted |

---

## DELETE /api/tasks/[id]

Soft-deletes a task by setting `deleted_at`.

### Response

```json
{ "success": true }
```

---

## GET /api/tasks/assignees

List users eligible to be task assignees. Returns employees and associates with their names and roles.

### Authentication

Requires `super_admin` role.

### Response

```json
{
  "data": [
    {
      "user_id": "uuid",
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "role": "employee"
    }
  ]
}
```

---

## GET /api/tasks/[id]/comments

List comments on a task with commenter names.

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "user_id": "uuid",
      "content": "I'll have this done by Thursday",
      "created_at": "2026-02-27T14:00:00Z",
      "commenter_name": "Juan Dela Cruz"
    }
  ]
}
```

---

## POST /api/tasks/[id]/comments

Create a comment on a task.

### Request Body (Zod: `taskCommentSchema`)

```json
{
  "content": "I'll have this done by Thursday"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | Comment text (min 1 character) |

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "task_id": "uuid",
    "user_id": "current-user-uuid",
    "content": "I'll have this done by Thursday",
    "created_at": "2026-02-27T14:00:00Z"
  }
}
```

---

## Zod Schemas

```typescript
// task.schema.ts
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: taskPrioritySchema.default('medium'),
  status: taskStatusSchema.default('pending'),
  dueDate: z.string().optional().nullable(),
});

const taskUpdateSchema = taskCreateSchema.partial();

const taskCommentSchema = z.object({
  content: z.string().min(1),
});
```

---

*Last updated: 2026-02-27*
