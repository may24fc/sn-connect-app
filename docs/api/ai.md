# AI API

> Audience: Developers

AI-powered HR assistant using Retrieval-Augmented Generation (RAG). Combines a vector knowledge base with Claude for contextual, policy-aware responses streamed via Server-Sent Events.

**Related hooks:** `useAIChat`, `useKnowledgeSources`  
**Database tables:** `knowledge_sources`, `knowledge_embeddings`  
**Storage bucket:** `ai-knowledge`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai/chat` | Any | Chat with AI assistant (streaming) |
| `GET` | `/api/ai/sources` | Admin | List knowledge sources |
| `POST` | `/api/ai/sources` | Admin | Create knowledge source |
| `GET` | `/api/ai/sources/[id]` | Admin | Get source with chunk count |
| `PATCH` | `/api/ai/sources/[id]` | Admin | Update source (clears embeddings) |
| `DELETE` | `/api/ai/sources/[id]` | Admin | Soft-delete + clean embeddings |
| `POST` | `/api/ai/sources/upload` | Admin | Upload source file |

---

## POST /api/ai/chat

Send a message to the AI assistant. Uses RAG to retrieve relevant HR policy context, then streams a Claude response via SSE.

### Request

```json
{
  "message": "What is the leave policy for probationary employees?",
  "conversationHistory": [
    { "role": "user", "content": "previous message" },
    { "role": "assistant", "content": "previous response" }
  ]
}
```

### RAG Pipeline

```
User message
  ↓
OpenAI text-embedding-3-small → 1536-dim vector
  ↓
Supabase RPC: match_knowledge_embeddings(query_embedding, match_threshold: 0.5, match_count: 5)
  ↓
Top-5 relevant chunks assembled as context
  ↓
Claude claude-sonnet-4-5-20250929 with system prompt + context → streaming response
```

### System Prompt

The AI is instructed to:
- Be a helpful HR assistant for SN Connect
- Reference company policies when answering
- State clearly when information is not in the knowledge base
- Provide responses in clear, professional language

### Streaming Response

`Content-Type: text/event-stream`

```
data: {"type":"text_delta","text":"The leave policy"}
data: {"type":"text_delta","text":" for probationary"}
data: {"type":"text_delta","text":" employees states..."}
data: {"type":"message_stop"}
```

### Audit Logging

Each chat interaction is logged to `audit_logs` with:
- `action`: `ai_chat`
- `details`: `{ messageLength, hasContext, contextChunks }`

---

## Knowledge Sources

### Source Types

| Type | Description |
|------|-------------|
| `policy` | Company policies |
| `handbook` | Employee handbooks |
| `faq` | Frequently asked questions |
| `procedure` | Standard operating procedures |
| `guideline` | Guidelines and best practices |
| `other` | Uncategorized |

---

### GET /api/ai/sources (Admin)

List knowledge sources with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Search title or content |
| `sourceType` | `string` | — | Filter by source type |
| `isActive` | `boolean` | — | Filter active/inactive |
| `sortBy` | `string` | `created_at` | Sort column |
| `sortOrder` | `asc\|desc` | `desc` | |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `20` | |

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Leave Policy 2026",
      "content": "Full policy text...",
      "source_type": "policy",
      "source_url": null,
      "file_path": "ai-knowledge/leave-policy.pdf",
      "is_active": true,
      "metadata": {},
      "created_by": "uuid",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 12, "totalPages": 1 }
}
```

### POST /api/ai/sources (Admin)

Create a knowledge source.

```json
{
  "title": "Leave Policy 2026",
  "content": "Full policy text here...",
  "sourceType": "policy",
  "sourceUrl": null,
  "filePath": null,
  "isActive": true,
  "metadata": {}
}
```

Action is audit-logged.

### GET /api/ai/sources/[id] (Admin)

Get source detail including chunk count from `knowledge_embeddings`.

```json
{
  "data": {
    "id": "uuid",
    "title": "Leave Policy 2026",
    "content": "...",
    "source_type": "policy",
    "is_active": true,
    "chunk_count": 15,
    "created_at": "2026-01-15T00:00:00Z"
  }
}
```

### PATCH /api/ai/sources/[id] (Admin)

Update a knowledge source. **When content changes, existing embeddings are deleted** to force re-embedding.

```json
{
  "title": "Leave Policy 2026 (Updated)",
  "content": "Updated policy text...",
  "isActive": true
}
```

After update, the `generate-embeddings` Edge Function should be triggered to re-chunk and re-embed the content.

### DELETE /api/ai/sources/[id] (Admin)

Soft-delete the source and clean up associated `knowledge_embeddings` records (hard-deleted).

---

## POST /api/ai/sources/upload (Admin)

Upload a file to use as a knowledge source.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | Document file |

### Constraints

| Constraint | Value |
|------------|-------|
| Max size | **10 MB** |
| Allowed MIME | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, `text/markdown` |

### Storage

Files are stored in the `ai-knowledge` bucket as: `{userId}_{timestamp}_{filename}`

### Embedding Pipeline

After upload, the `generate-embeddings` Supabase Edge Function is triggered via a fire-and-forget fetch:

1. Extracts text content from the uploaded file
2. Chunks text into segments
3. Generates embeddings via OpenAI `text-embedding-3-small`
4. Stores chunks + embeddings in `knowledge_embeddings` table (pgvector)

### Response

```json
{
  "data": {
    "id": "source-uuid",
    "title": "uploaded-file.pdf",
    "source_type": "policy",
    "file_path": "ai-knowledge/user_123_file.pdf",
    "is_active": true
  }
}
```

---

*Last updated: 2026-02-27*
