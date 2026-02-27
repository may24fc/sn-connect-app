# Standups API

> Audience: Developers

Standup meeting recordings with automatic transcription. Supports audio/video upload, transcription via Supabase Edge Function, and topic management.

**Related hooks:** `useStandups`, `useStandup`  
**Database tables:** `standups`, `standup_topics`  
**Storage bucket:** `standup-recordings`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/standups` | Any | List standups |
| `POST` | `/api/standups` | Any | Create standup |
| `GET` | `/api/standups/[id]` | Any | Get standup with topics |
| `PATCH` | `/api/standups/[id]` | Any | Update standup |
| `DELETE` | `/api/standups/[id]` | Any | Soft-delete standup |
| `POST` | `/api/standups/upload` | Any | Upload recording file |

---

## GET /api/standups

List standups with filtering and pagination.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search title or summary |
| `startDate` | `ISO date` | — | Filter recordings from this date |
| `endDate` | `ISO date` | — | Filter recordings until this date |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `20` | |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Daily Standup - Feb 15",
      "recording_url": "https://storage.../standup-recordings/...",
      "recording_date": "2026-02-15",
      "duration_seconds": 900,
      "attendees": ["uuid-1", "uuid-2"],
      "transcript": "...",
      "summary": "Discussed sprint progress...",
      "created_by": "uuid",
      "created_at": "2026-02-15T09:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 10, "totalPages": 1 }
}
```

---

## POST /api/standups

Create a standup record and trigger transcription.

```json
{
  "title": "Daily Standup - Feb 15",
  "recordingUrl": "https://storage.../standup-recordings/file.mp4",
  "recordingDate": "2026-02-15",
  "durationSeconds": 900,
  "attendees": ["uuid-1", "uuid-2"]
}
```

### Transcription Pipeline

After creating the standup record, the endpoint triggers the `transcribe-recording` Supabase Edge Function via a **fire-and-forget** `fetch` call (no `await`). The Edge Function:

1. Downloads the recording from storage
2. Transcribes the audio
3. Updates the standup's `transcript` and `summary` fields

Transcription errors do not affect the standup creation response.

---

## GET /api/standups/[id]

Get standup detail with `standup_topics` relation eagerly loaded.

```json
{
  "data": {
    "id": "uuid",
    "title": "Daily Standup - Feb 15",
    "recording_url": "...",
    "transcript": "Full transcription text...",
    "summary": "AI-generated summary...",
    "standup_topics": [
      {
        "id": "uuid",
        "topic": "Sprint progress",
        "discussed_by": "uuid",
        "notes": "All features on track"
      }
    ]
  }
}
```

---

## PATCH /api/standups/[id]

Update standup metadata or transcript/summary.

```json
{
  "title": "Updated title",
  "transcript": "Corrected transcript...",
  "summary": "Updated summary"
}
```

---

## DELETE /api/standups/[id]

Soft-delete by setting `deleted_at`.

---

## POST /api/standups/upload

Upload a recording file to the `standup-recordings` storage bucket.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | Recording file |

### Constraints

| Constraint | Value |
|------------|-------|
| Max size | **500 MB** |
| Allowed MIME | `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`, `video/mp4`, `video/webm` |

### Storage Path

Files are stored as: `standup-recordings/{userId}_{timestamp}_{filename}`

### Response

```json
{
  "url": "https://supabase-storage.../standup-recordings/user_1234_recording.mp4"
}
```

Uses the admin client for storage upload to bypass RLS on the storage bucket.

---

*Last updated: 2026-02-27*
