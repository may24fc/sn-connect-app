# Documents API

> Audience: Developers

Management of 201 file documents (employee records). Documents are stored in Supabase Storage (`employee-documents` bucket) with metadata tracked in the `documents` database table.

**Related hooks:** `useDocuments` (`apps/web/src/hooks/useDocuments.ts`)  
**Related schema:** `DocumentInsert` from `@hr-portal/database`  
**Database table:** `documents`  
**Storage bucket:** `employee-documents`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/documents` | Any (RLS) | List documents with filters |
| `POST` | `/api/documents` | Any authenticated | Create document metadata |
| `POST` | `/api/documents/upload` | Any (RLS) | Upload file + create record |
| `GET` | `/api/documents/[id]/download` | Any (RLS) | Generate signed download URL |

---

## GET /api/documents

List documents for an employee with filtering and pagination. RLS ensures employees see only their own documents; admins see all.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `employeeId` | `uuid` | — | Filter by employee |
| `documentType` | `string` | — | Filter by type (see [Document Types](#document-types)) |
| `isConfidential` | `"true" \| "false"` | — | Filter by confidential flag |
| `page` | `number` | `1` | Page number (1-based) |
| `pageSize` | `number` | `20` | Results per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "document_type": "government_id",
      "file_path": "emp-uuid/government_id/1709052000_passport.pdf",
      "file_name": "passport.pdf",
      "file_size": 2048576,
      "mime_type": "application/pdf",
      "is_confidential": true,
      "notes": "Valid until 2030",
      "uploaded_by": "uuid",
      "created_by": "uuid",
      "uploaded_at": "2026-02-20T10:00:00Z",
      "created_at": "2026-02-20T10:00:00Z",
      "deleted_at": null,
      "employees": {
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "employee_number": "EMP-001"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

Results are ordered by `uploaded_at` descending (newest first).

### Example

```bash
# List all documents for an employee
curl -X GET "https://your-app.com/api/documents?employeeId=550e8400-...&documentType=government_id" \
  -H "Cookie: sb-access-token=..."
```

---

## POST /api/documents

Create a document metadata record without uploading a file. Use this when the file was uploaded separately, or for records that reference external documents.

> For most use cases, prefer `POST /api/documents/upload` which handles both file upload and metadata creation in a single request.

### Request Body

```json
{
  "employee_id": "uuid",
  "document_type": "government_id",
  "file_path": "path/to/existing/file.pdf",
  "file_name": "passport.pdf",
  "file_size": 2048576,
  "mime_type": "application/pdf",
  "is_confidential": true,
  "notes": "Valid until 2030"
}
```

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "document_type": "government_id",
    "uploaded_by": "current-user-uuid",
    "created_by": "current-user-uuid",
    "created_at": "2026-02-27T10:00:00Z"
  }
}
```

---

## POST /api/documents/upload

Upload a document file to Supabase Storage and create the corresponding database metadata record. This is the primary method for document creation.

### Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | The document file |
| `employeeId` | `string` | Yes | Employee UUID |
| `documentType` | `string` | Yes | Document type enum value |
| `isConfidential` | `"true" \| "false"` | No | Confidential flag (default: `false`) |
| `notes` | `string` | No | Optional notes about the document |

### File Constraints

| Constraint | Value |
|------------|-------|
| Max file size | **10 MB** |
| Allowed types | `application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

### Storage Path Format

Files are stored as: `{employeeId}/{documentType}/{timestamp}_{sanitizedFileName}`

- File names are sanitized: non-alphanumeric characters (except `.` and `-`) are replaced with `_`
- Timestamp is `Date.now()` (milliseconds)

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "document_type": "government_id",
    "file_path": "emp-uuid/government_id/1709052000000_passport.pdf",
    "file_name": "passport.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "is_confidential": false,
    "uploaded_by": "current-user-uuid",
    "created_by": "current-user-uuid"
  }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `No file provided` | Missing `file` field in FormData |
| `400` | `File size exceeds 10MB limit` | File over 10 MB |
| `400` | `File type not allowed` | MIME type not in allowed list |
| `400` | `Missing required fields` | Missing `employeeId` or `documentType` |
| `401` | `Unauthorized` | No valid session |
| `500` | `Failed to upload file` | Storage upload error |
| `500` | `Failed to create document record` | DB insert failed (file is rolled back) |

### Rollback Behavior

If the database record creation fails after a successful file upload, the uploaded file is automatically deleted from storage to prevent orphaned files.

### Example

```bash
curl -X POST https://your-app.com/api/documents/upload \
  -H "Cookie: sb-access-token=..." \
  -F "file=@/path/to/passport.pdf" \
  -F "employeeId=550e8400-e29b-41d4-a716-446655440001" \
  -F "documentType=government_id" \
  -F "isConfidential=true" \
  -F "notes=Valid until 2030"
```

---

## GET /api/documents/[id]/download

Generate a short-lived signed URL for downloading a document.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uuid` | Document record ID |

### Response

```json
{
  "url": "https://your-project.supabase.co/storage/v1/object/sign/employee-documents/...",
  "fileName": "passport.pdf",
  "mimeType": "application/pdf"
}
```

### URL Expiration

The signed URL is valid for **60 seconds**. The client should immediately initiate the download or open the URL in a new tab.

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `Unauthorized` | No valid session |
| `404` | `Document not found or access denied` | ID not found, soft-deleted, or RLS denied |
| `500` | `Failed to generate download URL` | Storage signing error |

### Example

```bash
curl -X GET https://your-app.com/api/documents/550e8400-e29b-41d4-a716-446655440001/download \
  -H "Cookie: sb-access-token=..."
```

---

## Document Types

The `document_type` enum defines 10 categories:

| Value | Description |
|-------|-------------|
| `government_id` | Government-issued IDs (passport, driver's license) |
| `tax_document` | Tax-related documents (TIN, BIR forms) |
| `employment_contract` | Employment contracts and amendments |
| `resume` | Resume / CV |
| `diploma` | Academic diplomas and certificates |
| `clearance` | Clearance documents (NBI, police) |
| `medical_record` | Medical certificates and records |
| `performance_review` | Performance evaluation documents |
| `disciplinary_record` | Disciplinary action documentation |
| `other` | Miscellaneous documents |

---

## Database Schema

### `documents` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | No | Primary key |
| `employee_id` | `uuid` | No | FK → `employees(id)` |
| `document_type` | `document_type` | No | Document category |
| `file_path` | `text` | No | Storage path |
| `file_name` | `text` | Yes | Original file name |
| `file_size` | `integer` | Yes | File size in bytes |
| `mime_type` | `text` | Yes | MIME type |
| `is_confidential` | `boolean` | No | Default `false` |
| `notes` | `text` | Yes | |
| `uploaded_by` | `uuid` | Yes | FK → `auth.users(id)` |
| `uploaded_at` | `timestamptz` | No | Default `now()` |
| `created_at` | `timestamptz` | No | |
| `updated_at` | `timestamptz` | No | |
| `created_by` | `uuid` | Yes | FK → `auth.users(id)` |
| `deleted_at` | `timestamptz` | Yes | Soft delete |

### RLS Policies

- Employees can SELECT their own documents (via `employee_id` match)
- Admins can SELECT all documents
- Employees can INSERT documents for themselves
- Admins can INSERT documents for any employee

---

*Last updated: 2026-02-27*
