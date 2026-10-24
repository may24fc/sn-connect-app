# Performance API

> Audience: Developers

Performance management system covering review cycles, performance reviews, OKRs (Objectives & Key Results), and KPIs (Key Performance Indicators). Supports both admin-managed evaluations and employee self-assessments.

**Related hooks:** `usePerformanceCycles`, `usePerformanceReviews`, `useOKRs`, `useKPIs`, `useIndividualPerformance`  
**Zod schema:** `apps/web/src/lib/schemas/performance.schema.ts`  
**Database tables:** `review_cycles`, `performance_reviews`, `okrs`, `kpis`, `five_percent_reflections`, `performance_insight_conversations`, `performance_insight_messages`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/performance/cycles` | Any | List review cycles |
| `PATCH` | `/api/performance/cycles` | Admin | Update review cycle |
| `DELETE` | `/api/performance/cycles` | Admin | Delete review cycle |
| `GET` | `/api/performance/reviews` | Any (scoped) | List performance reviews |
| `POST` | `/api/performance/reviews` | Any | Create performance review |
| `PATCH` | `/api/performance/reviews` | Any | Update performance review |
| `GET` | `/api/performance/okrs` | Any (scoped) | List OKRs |
| `POST` | `/api/performance/okrs` | Any | Create OKR |
| `PATCH` | `/api/performance/okrs` | Any | Update OKR |
| `GET` | `/api/performance/okr-targets` | Any (scoped) | List OKR targets |
| `POST` | `/api/performance/okr-targets` | Any | Create OKR target |
| `PATCH` | `/api/performance/okr-targets` | Any | Update OKR target |
| `DELETE` | `/api/performance/okr-targets` | Any | Delete OKR target |
| `GET` | `/api/performance/kpis` | Any (scoped) | List KPIs |
| `POST` | `/api/performance/kpis` | Any | Create KPI |
| `PATCH` | `/api/performance/kpis` | Any | Update KPI |
| `GET` | `/api/performance/five-percent-reflections` | Any (scoped) | List 5% reflections or admin review feed |
| `POST` | `/api/performance/five-percent-reflections` | Employee | Submit 5% reflection and trigger delivery webhook |
| `POST` | `/api/performance/insights/chat` | Admin | Ask a question about 5% reflections (SSE stream) |
| `GET` | `/api/performance/insights/conversations` | Admin (own) | List saved insight conversations |
| `GET` | `/api/performance/insights/conversations/[id]` | Admin (own) | Conversation messages and staleness |
| `PATCH` | `/api/performance/insights/conversations/[id]` | Admin (own) | Rename a conversation |
| `DELETE` | `/api/performance/insights/conversations/[id]` | Admin (own) | Soft-delete a conversation |
| `GET` | `/api/performance/individual/[employeeId]` | Owner or admin | Full performance dashboard |

---

## Review Cycles

### GET /api/performance/cycles

List review cycles. Optionally filter by status.

**Query:** `?status=active`

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Q1 2026 Review",
      "description": "First quarter performance review",
      "start_date": "2026-01-01",
      "end_date": "2026-03-31",
      "self_review_deadline": "2026-03-15",
      "manager_review_deadline": "2026-03-25",
      "status": "active",
      "created_by": "uuid",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### PATCH /api/performance/cycles (Admin)

Update a review cycle. Requires `id` in body.

```json
{
  "id": "uuid",
  "status": "completed"
}
```

### DELETE /api/performance/cycles (Admin)

Hard-delete a review cycle.

---

## Performance Reviews

### GET /api/performance/reviews

List performance reviews. Non-admins see only their own reviews.

**Query:** `?cycleId=uuid&status=pending&employeeId=uuid`

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "cycle_id": "uuid",
      "employee_id": "uuid",
      "reviewer_id": "uuid",
      "status": "pending",
      "self_rating": 4,
      "self_comments": "...",
      "manager_rating": null,
      "manager_comments": null,
      "final_rating": null,
      "goals_for_next_period": null,
      "submitted_at": null,
      "completed_at": null,
      "review_cycles": { "id": "uuid", "name": "Q1 2026", "status": "active" },
      "employees": { "id": "uuid", "first_name": "Juan", "last_name": "Dela Cruz" }
    }
  ]
}
```

### POST /api/performance/reviews

Create a performance review. Non-admins are auto-scoped to their own employee ID.

```json
{
  "cycleId": "uuid",
  "employeeId": "uuid",
  "reviewerId": "uuid",
  "status": "pending",
  "selfRating": 4,
  "selfComments": "Met all Q1 objectives",
  "managerRating": null,
  "managerComments": null,
  "finalRating": null,
  "goalsForNextPeriod": null
}
```

### PATCH /api/performance/reviews

Update review fields. Requires `id` in body.

```json
{
  "id": "uuid",
  "managerRating": 4,
  "managerComments": "Excellent work",
  "status": "completed",
  "completedAt": "2026-03-25T10:00:00Z"
}
```

---

## OKRs

### GET /api/performance/okrs

List OKRs. Non-admins see only their own. Uses admin client for queries to bypass RLS cross-table issues.

**Query:** `?cycleId=uuid&status=in_progress&employeeId=uuid`

### POST /api/performance/okrs

Create an OKR.

```json
{
  "employeeId": "uuid",
  "cycleId": "uuid",
  "objective": "Improve customer satisfaction scores",
  "keyResults": [
    {
      "description": "Reduce ticket response time to <2 hours",
      "targetValue": 2,
      "currentValue": 0,
      "progressPercentage": 0
    }
  ],
  "progress": 0,
  "status": "in_progress"
}
```

### PATCH /api/performance/okrs

Update OKR fields. Supports admin evaluation fields.

```json
{
  "id": "uuid",
  "progress": 75,
  "status": "on_track",
  "adminRating": 4,
  "adminComments": "Good progress on key results",
  "evaluatedBy": "uuid",
  "evaluatedAt": "2026-03-20T10:00:00Z"
}
```

---

## KPIs

### GET /api/performance/kpis

List KPIs. Non-admins see only their own.

**Query:** `?cycleId=uuid&employeeId=uuid`

### POST /api/performance/kpis

Create a KPI.

```json
{
  "employeeId": "uuid",
  "cycleId": "uuid",
  "name": "Monthly Sales Target",
  "targetValue": 100000,
  "currentValue": 0,
  "unit": "PHP",
  "periodStart": "2026-01-01",
  "periodEnd": "2026-03-31"
}
```

### PATCH /api/performance/kpis

Update KPI fields. Supports admin evaluation fields.

```json
{
  "id": "uuid",
  "currentValue": 85000,
  "status": "on_track",
  "adminRating": 3,
  "adminComments": "85% of target achieved"
}
```

---

## 5% Reflections

### GET /api/performance/five-percent-reflections

Returns either the current user submission history or the admin review list, depending on role and query filters.

### POST /api/performance/five-percent-reflections

Creates a new 5% reflection for the current month. On successful insert, the API also fires a non-blocking webhook to `N8N_FIVE_PERCENT_REFLECTION_WEBHOOK_URL` so n8n can generate and deliver a PDF copy.

**Delivery contract:**

- The API never blocks the response on n8n delivery success.
- The webhook still fires when user delivery channels are disabled so the workflow can keep its hard-coded admin Telegram notification.
- Gmail delivery should run only when `recipient.channels.gmail` is `true` and `recipient.email` is present.
- Telegram delivery should run only when `recipient.channels.telegram` is `true` and `recipient.telegram.chat_id` is present.

**Webhook payload:**

```json
{
  "event": "five_percent_reflection.submitted",
  "submitted_at": "2026-05-27T09:15:00.000Z",
  "reflection": {
    "id": "uuid",
    "month_key": "2026-05",
    "full_name": "Jane Dela Cruz",
    "department_role": "People Operations",
    "work": {
      "feelings": "Focused and optimistic",
      "headline": "Rebuilt onboarding checklist",
      "significance": "It removed repeated follow-up work",
      "rank": 4,
      "action": "Protect time for rollout"
    },
    "family": {
      "feelings": "Steady",
      "headline": "More intentional evenings",
      "significance": "Consistency helped everyone at home",
      "rank": 4,
      "action": "Keep weekends device-light"
    },
    "personal": {
      "feelings": "Curious",
      "headline": "Studied delegation patterns",
      "significance": "It changed how I prioritize",
      "rank": 5,
      "action": "Apply one change next sprint"
    },
    "deep_dive_parking_lot": "How to sustain the new cadence during month-end",
    "exploration_topics": "Delegation, energy management"
  },
  "recipient": {
    "user_id": "uuid",
    "employee_id": "uuid",
    "display_name": "Jane Dela Cruz",
    "first_name": "Jane",
    "last_name": "Dela Cruz",
    "email": "jane@example.com",
    "channels": {
      "gmail": true,
      "telegram": true
    },
    "telegram": {
      "chat_id": "6708968435",
      "username": "janedela"
    }
  }
}
```

**n8n implementation notes:**

- Generate the PDF before channel branching so both Gmail and Telegram can reuse the same binary.
- Telegram should use `sendDocument`; n8n MCP validation confirms the node requires a binary file.
- Gmail should use `send`; n8n MCP validation confirms the node requires `To`, `Subject`, `Email Type`, and `Message`.
- Keep the separate hard-coded admin Telegram node outside the user preference branches.

---

## Reflection Insights (Ask AI)

Saved, streaming question-and-answer conversations about 5% reflections for performance admins (`admin`, `super_admin`). Reflections are read through the RLS-scoped client, which requires migration `20261025000002`. Every route re-checks the role on each request. Conversation rows are visible only to their owner while they remain a performance admin (RLS on `performance_insight_conversations` / `performance_insight_messages`). Feature record: `docs/features/performance-reflection-insights/`.

**Data sent to the model:** 5% reflections for the conversation's month (full text, shortened to fit the token budget when needed) plus condensed earlier months, with averages, medians, deltas, flags and the pending roster computed in code (`apps/web/src/lib/performance/insights/`). **Identifiers are sent only as tokens or placeholders:** teammates as `Person-07`; other people, places, and organizations mentioned in reflection text, the question, or replayed history as `Mention-003` (`mentions.ts`, local NLP); links, handles, ID numbers, addresses, and birth dates as `[url]`, `[handle]`, `[id-number]`, `[address]`, `[birth-date]` (`personal-details.ts`). Tokens in the streamed answer are restored on the server (`pseudonymize.ts`); placeholders are not. Departments, ranks, and other reflection content are still sent. Lower-case names are not detected. Emails and phone numbers are redacted. Employee text is escaped and the system prompt treats it as data, not instructions. Model: OpenAI `gpt-5.4-mini` through `streamCompletion` in `@hr-portal/ai`.

**Audit and tracing:** `audit_logs` receives `performance_insight_query` (kind, period, window, question/answer length, tokens, model, truncation, TTFB/stream ms, outcome) and `performance_insight_conversation_delete`. No question, answer or reflection text is written to audit rows or LangWatch spans.

### POST /api/performance/insights/chat

Request (`performanceInsightChatSchema`):

```json
{
  "conversationId": "uuid (optional; omitted starts a new conversation)",
  "evaluationKind": "five_percent",
  "periodKey": "2026-10",
  "monthsBack": 3,
  "message": "Whose family rank dropped the most?"
}
```

- `message` is trimmed, 1-2000 characters. `monthsBack` is 0-6 (default 3).
- An existing conversation keeps its stored `periodKey` and `monthsBack`; request values are ignored.
- History is read from the database (last 10 completed messages); the client never sends it.

Errors: `400` invalid input, `401`, `403` non-admin, `404` conversation not visible to the caller, `422` no reflections in the window, `429` rate limit (30 questions/hour, 150/day, counted across deleted conversations; `Retry-After` header and `details.retryAfterSeconds`), `503` OpenAI key missing.

Success is `text/event-stream`, one `data: {json}` frame per event, in this order:

| Event | Fields |
| --- | --- |
| `conversation` | `conversationId`, `title`, `created` |
| `context` | `periodKey`, `monthsIncluded`, `submittedCount`, `pendingCount`, `truncated`, `priorMode` (`P0`/`P1`/`P2`), `dataChangedSinceLastAnswer` |
| `content` | `text` (repeated) |
| `done` | `messageId`, `usage: { inputTokens, outputTokens }` |
| `error` | `code` (`llm_failed` or `persist_failed`), `message` (generic; upstream detail is logged server-side only) |

The question is saved before streaming. The answer is saved with status `complete`, `error`, or `aborted` (client disconnect or Stop), along with the source snapshot hash used for staleness checks. `Server-Timing` exposes `insight_auth`, `insight_context`, and `insight_persist`.

### GET /api/performance/insights/conversations

Query: `evaluationKind=five_percent`, `limit` 1-50 (default 30), `offset` (default 0). Returns `{ data: { conversations, total } }`, newest activity first, caller's own conversations only.

### GET /api/performance/insights/conversations/[id]

Returns `{ data: { conversation, messages, currentSnapshotHash, isStale } }`. `isStale` is true when the latest answer was generated from different reflection data than the current window. `404` when the id is invalid or not visible.

### PATCH /api/performance/insights/conversations/[id]

Body `{ "title": "1-120 characters" }`. Returns `{ data: conversation }`.

### DELETE /api/performance/insights/conversations/[id]

Soft-deletes the conversation (its messages become invisible) and returns `204`.

---

## OKR Targets

OKR targets are sub-items within an OKR, tracking measurable key results.

### GET /api/performance/okr-targets

List OKR targets. Non-admins are scoped to their own employee ID. Supports filtering by `okrId`, `cycleId`, and `employeeId`.

#### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `okrId` | UUID | Filter by parent OKR |
| `cycleId` | UUID | Filter by review cycle |
| `employeeId` | UUID | Filter by employee (admin only) |

### POST /api/performance/okr-targets

Create a new OKR target. Validated with `createOKRTargetSchema`.

```json
{
  "okrId": "okr-uuid",
  "employeeId": "employee-uuid",
  "cycleId": "cycle-uuid",
  "description": "Complete 10 code reviews",
  "targetValue": 10,
  "currentValue": 0,
  "unit": "reviews"
}
```

### PATCH /api/performance/okr-targets

Update an OKR target's progress or details. Validated with `updateOKRTargetSchema`.

```json
{
  "id": "target-uuid",
  "currentValue": 7,
  "status": "in_progress"
}
```

### DELETE /api/performance/okr-targets?id=

Soft-delete an OKR target by ID.

---

## GET /api/performance/individual/[employeeId]

Full performance dashboard for a single employee. Non-admins can only view their own profile.

### Response

```json
{
  "employee": {
    "id": "uuid",
    "userId": "uuid",
    "fullName": "Juan Dela Cruz",
    "position": "Software Engineer",
    "department": "Engineering",
    "status": "active",
    "employmentType": "regular",
    "dateHired": "2025-06-01",
    "avatarUrl": "https://...",
    "role": "employee",
    "email": "juan@company.com"
  },
  "kpis": [ /* all KPI records */ ],
  "kpiSummary": {
    "total": 5,
    "completed": 2,
    "avgProgress": 72
  },
  "okrs": [ /* all OKR records */ ],
  "okrSummary": {
    "total": 3,
    "completed": 1,
    "avgProgress": 65
  },
  "reviews": [ /* all reviews with review_cycles */ ],
  "latestReview": { /* most recent review */ }
}
```

---

*Last updated: 2026-03-08*
