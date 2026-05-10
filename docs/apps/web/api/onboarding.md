# Onboarding API

> Audience: Developers

Multi-step onboarding flow for new hires. Covers self-service profile creation, document upload, checklist management, and admin-side review/approval. Uses a **credentials-first** model: users get login credentials first, then complete onboarding through the app.

**Related hooks:** `useOnboardingProfile`, `useOnboardingDocuments`, `useOnboardingChecklists`  
**Zod schemas:** `apps/web/src/lib/schemas/onboarding.schema.ts`, `apps/web/src/lib/schemas/onboarding-view.schema.ts`  
**Database tables:** `onboarding_profiles`, `onboarding_documents`, `onboarding_checklists`, `onboarding_tasks`  
**Storage bucket:** `onboarding-documents`

---

## Endpoints

### Self-Service (Employee)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/onboarding/profile` | Any | Get own onboarding profile |
| `POST` | `/api/onboarding/profile` | Any | Create own onboarding profile |
| `PATCH` | `/api/onboarding/profile/step` | Any | Save step data (personal/payment info) |
| `POST` | `/api/onboarding/profile/complete` | Any | Complete onboarding |
| `GET` | `/api/onboarding/documents` | Any | List own uploaded documents |
| `POST` | `/api/onboarding/documents` | Any | Upload a document |
| `DELETE` | `/api/onboarding/documents/[id]` | Owner or admin | Delete a document |
| `GET` | `/api/onboarding/documents/[id]/preview` | Owner or admin | Get signed preview URL |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/onboarding` | Any (scoped) | List onboarding checklists |
| `POST` | `/api/onboarding` | Admin | Create checklist with tasks |
| `GET` | `/api/onboarding/profiles` | Admin | List all onboarding profiles |
| `GET` | `/api/onboarding/profiles/[id]` | Admin | Get profile detail |
| `GET` | `/api/onboarding/profiles/[id]/documents` | Admin | List profile documents |
| `POST` | `/api/onboarding/initiate` | Admin | Invoke onboarding Edge Function |
| `GET` | `/api/onboarding/[id]/tasks` | Owner or admin | List checklist tasks |
| `POST` | `/api/onboarding/[id]/tasks` | Admin | Add task to checklist |
| `PATCH` | `/api/onboarding/[id]/tasks` | Owner or admin | Toggle task completion |

---

## Onboarding Flow

```
1. Admin invites user (POST /api/users/invite)
   → Creates auth user + public.users (status: pending_onboarding)
   → Creates initial onboarding_profile

2. New user logs in with temporary password
   → Redirected to onboarding wizard

3. User fills personal info (PATCH /api/onboarding/profile/step)
   → Step: personal_info

4. User fills payment info (PATCH /api/onboarding/profile/step)
   → Step: payment_info

5. User uploads documents (POST /api/onboarding/documents)
   → Step: documents

6. User reviews and submits (POST /api/onboarding/profile/complete)
   → Profile marked is_completed=true
   → User status → awaiting_approval

7. Admin reviews (GET /api/onboarding/profiles/[id])
   → Approves or rejects (POST /api/users/approve-onboarding)
   → On approve: user status → active, employee record created
```

---

## GET /api/onboarding/profile

Get the current user's onboarding profile with department info.

### Response

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "current_step": "personal_info",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "is_completed": false,
    "completed_at": null,
    "departments": { "id": "uuid", "name": "Engineering" },
    "created_at": "2026-02-27T10:00:00Z"
  }
}
```

Returns `{ "data": null }` if no profile exists yet.

---

## POST /api/onboarding/profile

Create the initial onboarding profile. Idempotent — returns existing profile if already created.

### Request Body (optional pre-fill)

```json
{
  "firstName": "Juan",
  "middleName": null,
  "lastName": "Dela Cruz",
  "emailAddress": "juan@company.com"
}
```

### Response

**201 Created** (or 200 if already exists)

---

## PATCH /api/onboarding/profile/step

Save data for a specific onboarding step. Creates a profile if one doesn't exist (upsert behavior).

### Request Body (Zod: `updateOnboardingStepSchema`)

```json
{
  "step": "personal_info",
  "data": { ... }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `step` | `enum` | Yes | `personal_info`, `payment_info`, `documents`, `review` |
| `data` | `object` | Yes | Step-specific payload |

### Step: `personal_info` (Zod: `personalInfoSchema`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `firstName` | `string` | Yes | Max 120 |
| `middleName` | `string` | No | Max 120 |
| `lastName` | `string` | Yes | Max 120 |
| `position` | `string` | Yes | Max 150 |
| `personalEmail` | `string` | Yes | Valid email, max 150 |
| `companyEmail` | `string` | Yes | Valid email, max 150 |
| `departmentId` | `uuid` | No | |
| `startDate` | `string` | No | YYYY-MM-DD |
| `nationality` | `string` | Yes | Max 120 |
| `contactNumber` | `string` | Yes | Valid phone (libphonenumber-js), include country code |
| `emailAddress` | `string` | No | Valid email |
| `education` | `string` | Yes | Max 300 |
| `major` | `string` | No | Max 200 |
| `birthday` | `string` | Yes | YYYY-MM-DD |
| `age` | `number` | No | 0-120 |
| `address` | `string` | Yes | Max 500 |
| `emergencyContactName` | `string` | Yes | Max 120 |
| `emergencyContactNumber` | `string` | Yes | Valid phone |
| `emergencyContactEmail` | `string` | No | Valid email |
| `emergencyContactRelationship` | `string` | Yes | Max 80 |
| `linkedinProfileUrl` | `string` | No | Valid URL |

### Step: `payment_info` (Zod: `paymentInfoSchema`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `paymentAccountName` | `string` | Yes | Max 150 |
| `paymentAccountNumber` | `string` | Yes | Max 30. **PII — never log** |
| `paymentEmail` | `string` | Yes | Valid email, max 150 |
| `paymentPhoneNumber` | `string` | Yes | Valid phone (libphonenumber-js) |
| `paymentAddress` | `string` | Yes | Max 500 |
| `paymentCity` | `string` | Yes | Max 100 |
| `paymentProvince` | `string` | Yes | Max 100 |
| `paymentZipcode` | `string` | No | Max 20 |

### Response

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "current_step": "personal_info",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "...": "all profile fields"
  }
}
```

---

## POST /api/onboarding/profile/complete

Mark onboarding as complete. Requires at least one uploaded document.

### Request Body (Zod: `completeOnboardingSchema`)

```json
{ "confirm": true }
```

### Behavior

1. Checks that the user has an onboarding profile
2. Verifies at least one document has been uploaded
3. Sets `is_completed = true`, `completed_at = now()`, `current_step = 'review'`
4. Updates `users.status` to `awaiting_approval` (via admin client to bypass RLS)

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Please upload required documents...` | No documents uploaded |
| `404` | `Onboarding profile not found` | No profile for user |

---

## POST /api/onboarding/documents

Upload a document to the onboarding profile. Uses `multipart/form-data`.

### Request (FormData)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | The file to upload |
| `documentType` | `string` | Yes | `valid_id`, `profile_photo`, `cv`, `birth_certificate` |

### File Constraints

| Constraint | Value |
|------------|-------|
| Max size | 10 MB |
| Allowed MIME | `image/jpeg`, `image/png`, `image/gif`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

### Behavior

1. Auto-creates an onboarding profile if none exists
2. Uploads to Supabase Storage: `onboarding-documents/{user_id}/{type}-{timestamp}-{filename}`
3. Soft-deletes any previous document of the same `documentType` (replacement)
4. Creates metadata record in `onboarding_documents`
5. Updates profile `current_step` to `'documents'`

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "onboarding_profile_id": "uuid",
    "document_type": "valid_id",
    "file_path": "user-uuid/valid_id-1709049600000-id-card.jpg",
    "file_name": "id-card.jpg",
    "file_size": 1234567,
    "mime_type": "image/jpeg",
    "uploaded_at": "2026-02-27T10:00:00Z"
  }
}
```

---

## GET /api/onboarding/documents

List the current user's uploaded onboarding documents.

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "document_type": "valid_id",
      "file_name": "id-card.jpg",
      "file_size": 1234567,
      "mime_type": "image/jpeg",
      "uploaded_at": "2026-02-27T10:00:00Z"
    }
  ]
}
```

---

## DELETE /api/onboarding/documents/[id]

Soft-delete a document and remove from storage. Owner or admin can delete.

### Response

```json
{ "success": true }
```

---

## GET /api/onboarding/documents/[id]/preview

Generate a signed URL for document preview. Valid for 10 minutes.

### Response

```json
{
  "data": {
    "id": "uuid",
    "fileName": "id-card.jpg",
    "signedUrl": "https://storage.supabase.co/...?token=..."
  }
}
```

---

## GET /api/onboarding/profiles (Admin)

List all onboarding profiles with filters, pagination, and summary stats.

### Authentication

Requires admin or super_admin role (`isOnboardingAdmin`).

### Query Parameters (Zod: `onboardingProfileFiltersSchema`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search first/last name or email |
| `status` | `string` | — | `completed` or `in_progress` |
| `role` | `string` | — | Filter by user role |
| `departmentId` | `uuid` | — | Filter by department |
| `startDate` | `string` | — | Created after date |
| `endDate` | `string` | — | Created before date |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `10` | |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "full_name": "Juan Dela Cruz",
      "status": "completed",
      "is_completed": true,
      "payment_account_masked": "****5678",
      "users": { "id": "uuid", "role": "employee" },
      "departments": { "id": "uuid", "name": "Engineering" }
    }
  ],
  "summary": {
    "total": 15,
    "completed": 10,
    "inProgress": 5
  },
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

> **Security:** Payment account numbers are masked with `maskPaymentAccount()` — only the last 4 digits are visible (`****5678`).

---

## GET /api/onboarding/profiles/[id] (Admin)

Get a single onboarding profile with computed `full_name`, `status`, and masked payment info.

---

## GET /api/onboarding/profiles/[id]/documents (Admin)

List documents belonging to a specific onboarding profile.

---

## POST /api/onboarding/initiate (Admin)

Invoke the `onboarding-new-employee` Supabase Edge Function.

### Request Body

```json
{
  "employeeId": "uuid",
  "employeeEmail": "juan@company.com",
  "employeeName": "Juan Dela Cruz"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | `uuid` | Yes | Employee UUID |
| `employeeEmail` | `string` | No | Employee email |
| `employeeName` | `string` | No | Employee display name |

### Behavior

Invokes `supabaseAdmin.functions.invoke('onboarding-new-employee', { body })`. Returns the Edge Function's response.

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `502` | `Failed to invoke onboarding Edge Function` | Edge Function error |

---

## Onboarding Checklists

### GET /api/onboarding

List onboarding checklists with tasks.

- Non-admin users: scoped to their own employee's checklists
- Admin: can pass `?employeeId=uuid` to view any employee's checklists

### POST /api/onboarding

Create a checklist with optional tasks.

**Admin only.**

```json
{
  "employeeId": "uuid",
  "tasks": [
    {
      "title": "Complete tax form",
      "description": "BIR Form 2316",
      "category": "compliance",
      "isRequired": true,
      "dueDaysFromStart": 7,
      "assignedTo": "uuid"
    }
  ]
}
```

### GET /api/onboarding/[id]/tasks

List tasks for a checklist. Owner or admin.

### POST /api/onboarding/[id]/tasks

Add a single task to an existing checklist. Admin only.

### PATCH /api/onboarding/[id]/tasks

Toggle task completion status. Owner can update their own tasks.

```json
{
  "taskId": "uuid",
  "isCompleted": true
}
```

Sets `completed_at` when `isCompleted = true`, clears it when `false`.

---

## Zod Schemas

```typescript
// onboarding.schema.ts
const onboardingStepSchema = z.enum(['personal_info', 'payment_info', 'documents', 'review']);
const onboardingDocumentTypeSchema = z.enum(['valid_id', 'profile_photo', 'cv', 'birth_certificate']);

// Phone validation uses libphonenumber-js
const phoneNumber = z.string().min(1).refine(val => isValidPhoneNumber(val), {
  message: 'Invalid phone number. Include country code (e.g., +63 for PH, +39 for IT)',
});

const personalInfoSchema = z.object({ /* 19 fields — see above */ });
const paymentInfoSchema = z.object({ /* 8 fields — see above */ });
const updateOnboardingStepSchema = z.object({ step, data: z.record(z.unknown()) });
const completeOnboardingSchema = z.object({ confirm: z.literal(true) });
```

---

*Last updated: 2026-02-27*
