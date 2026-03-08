# Profile API

> Audience: Developers

Self-service profile management for authenticated users. Includes avatar upload/removal via Supabase Storage and personal information updates via the onboarding profile.

**Related hooks:** `useProfile`, `useAvatarUpload`  
**Zod schemas:** Inline `partialProfileSchema` in `apps/web/src/app/api/profile/info/route.ts`  
**Database tables:** `onboarding_profiles`  
**Storage:** Supabase Storage `avatars` bucket

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/profile/avatar` | Any authenticated | Upload or replace avatar |
| `DELETE` | `/api/profile/avatar` | Any authenticated | Remove avatar |
| `PATCH` | `/api/profile/info` | Any authenticated | Update personal information |

---

## POST /api/profile/avatar

Upload or replace the current user's profile avatar. Stores the file in the Supabase Storage `avatars` bucket and updates auth `user_metadata.avatar_url`.

### Authentication

Any authenticated user.

### Request

Content-Type: `multipart/form-data`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `file` | File | Max 5MB; JPEG, PNG, WebP, GIF | Avatar image file |

### Behavior

1. Validates file type and size
2. Deletes any existing avatar files for this user
3. Uploads new file as `{userId}/avatar.{ext}`
4. Gets public URL and appends cache-busting query param
5. Updates auth `user_metadata.avatar_url`
6. On metadata update failure, rolls back the storage upload

### Response

```json
{
  "data": {
    "avatar_url": "https://storage.example.com/avatars/uuid/avatar.jpg?v=1709856000000"
  }
}
```

---

## DELETE /api/profile/avatar

Remove the current user's avatar from storage and clear `user_metadata.avatar_url`.

### Authentication

Any authenticated user.

### Response

```json
{ "success": true }
```

---

## PATCH /api/profile/info

Partially update the current user's personal profile information stored in `onboarding_profiles`. If no profile record exists, one is created automatically.

### Authentication

Any authenticated user.

### Request Body

All fields are optional. Send only the fields you want to update.

```json
{
  "nationality": "Filipino",
  "contactNumber": "+63 912 345 6789",
  "emailAddress": "juan@personal.com",
  "companyEmail": "juan@company.com",
  "education": "BS Computer Science",
  "major": "Software Engineering",
  "birthday": "1995-06-15",
  "age": 30,
  "address": "123 Main St, Manila",
  "emergencyContactName": "Maria Dela Cruz",
  "emergencyContactNumber": "+63 912 000 0000",
  "emergencyContactRelationship": "Mother",
  "linkedinProfileUrl": "https://linkedin.com/in/juandelacruz"
}
```

| Field | Type | Max Length | Description |
|-------|------|-----------|-------------|
| `nationality` | string | 120 | Nationality |
| `contactNumber` | string | 30 | Contact phone number |
| `emailAddress` | string (email) | — | Personal email |
| `companyEmail` | string (email) | — | Company email |
| `education` | string | 300 | Education background |
| `major` | string | 200 | Field of study |
| `birthday` | string (date) | — | Date of birth (YYYY-MM-DD) |
| `age` | number | 0–120 | Age |
| `address` | string | 500 | Home address |
| `emergencyContactName` | string | 120 | Emergency contact name |
| `emergencyContactNumber` | string | 30 | Emergency contact number |
| `emergencyContactRelationship` | string | 80 | Relationship to contact |
| `linkedinProfileUrl` | string (URL) | — | LinkedIn profile URL |

Empty strings are converted to `null` in the database. Uses a camelCase→snake_case field mapping. The schema uses `.strict()` — unknown fields are rejected.

### Response

Returns the full updated `onboarding_profiles` record.

---

*Last updated: 2026-03-08*
