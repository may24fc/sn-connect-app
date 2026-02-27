# Users API

> Audience: Developers

User lifecycle management — inviting new users, approving completed onboarding, and assigning employees/interns to their respective trackers. All endpoints require admin-level access.

**Database tables:** `users`, `employees`, `internships`, `onboarding_profiles`, `audit_logs`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/users/invite` | admin, super_admin | Invite a new user |
| `POST` | `/api/users/approve-onboarding` | admin, super_admin | Approve or reject onboarding |
| `POST` | `/api/users/assign-employee` | admin, super_admin | Assign employee to probation |
| `POST` | `/api/users/assign-intern` | admin, super_admin | Assign intern with details |

---

## POST /api/users/invite

Create a new auth user with temporary credentials and an initial onboarding profile.

### Request Body

```json
{
  "email": "juan@company.com",
  "role": "employee",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "departmentId": "uuid",
  "position": "Software Engineer"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |
| `role` | `enum` | Yes | `employee` or `intern` |
| `firstName` | `string` | Yes | Min 1 char |
| `lastName` | `string` | Yes | Min 1 char |
| `departmentId` | `uuid` | No | |
| `position` | `string` | No | |

### Behavior

1. Checks caller is admin/super_admin
2. Verifies email is not already registered (409 if exists)
3. Generates a 12-character temporary password (upper + lower + digits + special)
4. Creates auth user via `supabaseAdmin.auth.admin.createUser()` with `email_confirm: true`
5. Upserts `public.users` record with `status: 'pending_onboarding'`
6. Creates initial `onboarding_profiles` record pre-filled with name/email/position
7. Returns the temporary password to the admin for sharing

### Response

**201 Created**

```json
{
  "message": "User invited successfully",
  "data": {
    "userId": "uuid",
    "email": "juan@company.com",
    "temporaryPassword": "Abc3!xYz9#mN",
    "role": "employee"
  }
}
```

> **Security:** The temporary password is returned once. Store it securely and share via a secure channel. The user should change it on first login.

### Rollback

If `public.users` creation fails, the auth user is automatically deleted via `supabaseAdmin.auth.admin.deleteUser()`.

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `409` | `A user with this email already exists` | Duplicate email |
| `500` | `Failed to create auth user` | Supabase Auth error |
| `500` | `Failed to create user profile` | public.users insert failed (auth user rolled back) |

---

## POST /api/users/approve-onboarding

Approve or reject a completed onboarding submission.

### Request Body

```json
{
  "userId": "uuid",
  "approved": true,
  "notes": "All documents verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `uuid` | Yes | Target user's ID |
| `approved` | `boolean` | Yes | `true` to approve, `false` to reject |
| `notes` | `string` | No | Admin feedback |

### Approval Behavior

When `approved: true`:

1. Updates `users.status` from `awaiting_approval` to `active`
2. Reads the user's `onboarding_profiles` record
3. Creates an `employees` record (if not exists) with:
   - Generated employee number (`EMP-YYYYMMDD-NNNN`)
   - Personal info from onboarding profile
   - `employment_type` based on role (`intern` → `'intern'`, others → `'regular'`)
   - `work_arrangement: 'full_time'`
   - Payment info (account name/number)
   - Emergency contact info

### Rejection Behavior

When `approved: false`: currently keeps the user at `awaiting_approval` status (no status change). Notes are returned but not persisted (TODO: persist rejection notes, send notification).

### Response

```json
{
  "message": "Onboarding approved and user activated successfully",
  "data": { "userId": "uuid", "status": "active" }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `User is not awaiting approval` | Status is not `awaiting_approval` |
| `404` | `Target user not found` | Invalid userId |

---

## POST /api/users/assign-employee

Assign an approved employee to the probation tracker with stage details.

### Request Body

```json
{
  "userId": "uuid",
  "department": "Engineering",
  "stage": 1,
  "status": "on-track",
  "probationEndDate": "2026-08-27"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `userId` | `uuid` | Yes | |
| `department` | `string` | Yes | Min 1 char |
| `stage` | `number` | Yes | 1-4 |
| `status` | `enum` | Yes | `on-track` or `at-risk` |
| `probationEndDate` | `string` | Yes | YYYY-MM-DD |

### Behavior

1. Finds the employee record for the given userId
2. Updates employee's `department` and `probation_end_date`
3. Logs operation to `audit_logs`

### Response

```json
{
  "message": "Employee assigned to probation tracker successfully",
  "data": {
    "employeeId": "uuid",
    "userId": "uuid",
    "department": "Engineering",
    "stage": 1,
    "status": "on-track",
    "probationEndDate": "2026-08-27"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `404` | `Employee record not found...` | No employee for userId (onboarding not approved) |

---

## POST /api/users/assign-intern

Assign an approved intern with program details. Creates or updates an internship record.

### Request Body

```json
{
  "userId": "uuid",
  "department": "Engineering",
  "startDate": "2026-03-01",
  "endDate": "2026-06-30",
  "requiredHours": 480,
  "school": "University of the Philippines",
  "program": "BS Computer Science"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `userId` | `uuid` | Yes | |
| `department` | `string` | Yes | Min 1 char |
| `startDate` | `string` | Yes | YYYY-MM-DD |
| `endDate` | `string` | Yes | YYYY-MM-DD, must be after startDate |
| `requiredHours` | `number` | Yes | Min 1 |
| `school` | `string` | No | |
| `program` | `string` | No | |

### Behavior

1. Validates `endDate > startDate`
2. Finds the employee record for userId
3. Updates employee's department
4. Checks for existing `internships` record:
   - If exists: updates all fields (admin client to bypass RLS)
   - If not: inserts new record with `completed_hours: 0`, `status: 'active'`
5. Logs operation to `audit_logs`

### Response

```json
{
  "message": "Internship assigned successfully",
  "data": {
    "internshipId": "uuid",
    "employeeId": "uuid",
    "userId": "uuid",
    "department": "Engineering",
    "startDate": "2026-03-01",
    "endDate": "2026-06-30",
    "requiredHours": 480
  }
}
```

---

## User Lifecycle States

```
(invite)        → pending_onboarding
(complete form) → awaiting_approval
(approve)       → active
(reject)        → awaiting_approval (unchanged)
```

---

*Last updated: 2026-02-27*
