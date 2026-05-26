# ADR 006: Knowledge Base Versioning Strategy

## Status

Accepted

## Context

The AI Knowledge Base in Control Hub allows admins to manage source documents that are chunked, embedded, and used for RAG-powered chat. As the knowledge base grows, several risks emerged:

1. **Accidental overwrites** — Admins editing a knowledge source could inadvertently delete or corrupt important content with no way to recover.
2. **No audit trail** — While `audit_logs` tracks that a change occurred, it doesn't preserve the full previous content in a queryable format.
3. **No rollback capability** — If an edit introduces errors, the only recovery path was manual re-entry.
4. **Compliance** — Enterprise HR policies may require version history for policy documents.
5. **Collaboration** — Multiple admins editing the same source need visibility into who changed what and when.

## Decision

Implement automatic version snapshotting via a PostgreSQL trigger on the `knowledge_sources` table.

### Architecture

```
             ┌──────────────────────┐
             │  knowledge_sources   │
             │  (current state)     │
             │  current_version: N  │
             └──────────┬───────────┘
                        │ BEFORE UPDATE trigger
                        │ (snapshot_knowledge_source_version)
                        ▼
    ┌───────────────────────────────────────┐
    │     knowledge_source_versions         │
    │  version 1  │  version 2  │  ...  │ N │
    │  (immutable snapshots of old state)   │
    └───────────────────────────────────────┘
```

### Mechanism

1. A `BEFORE UPDATE` trigger on `knowledge_sources` fires when `title` or `content` changes.
2. The trigger function `snapshot_knowledge_source_version()`:
   - Inserts the **old** `title` and `content` into `knowledge_source_versions` with the current version number.
   - Increments `current_version` on the source.
   - Records `auth.uid()` as `changed_by`.
3. The new content is then applied to `knowledge_sources` as normal.

### Schema

```sql
CREATE TABLE public.knowledge_source_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  change_summary text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT uq_knowledge_versions_source_version
    UNIQUE (source_id, version_number)
);
```

### Functions

| Function | Purpose |
|----------|---------|
| `snapshot_knowledge_source_version()` | Trigger — auto-snapshots old state before update |
| `get_knowledge_source_versions(uuid)` | Query — returns version history with editor names |
| `restore_knowledge_source_version(uuid, integer)` | Action — restores source to a previous version (which itself triggers a new snapshot) |

### RLS

- `knowledge_versions_admin_read_policy` — Only admin/super_admin can SELECT
- `knowledge_versions_admin_insert_policy` — Only admin/super_admin can INSERT (trigger runs as SECURITY DEFINER)

## Consequences

### Positive

- **Zero-config versioning** — Every edit is automatically snapshotted without any code changes in the application layer.
- **Full rollback** — `restore_knowledge_source_version()` provides one-call restore.
- **Audit trail** — Version history includes who changed it, when, and optionally a summary.
- **Cascade delete** — When a source is deleted, all versions are cleaned up automatically (`ON DELETE CASCADE`).
- **No performance impact on reads** — The trigger only fires on UPDATE, not on SELECT.

### Negative

- **Storage growth** — Each edit creates a full copy of `title` + `content`. For large documents, this can grow quickly.
- **No diff storage** — Full snapshots rather than diffs mean higher storage usage but simpler implementation.
- **Trigger complexity** — `SECURITY DEFINER` trigger must be carefully maintained to avoid privilege escalation.
- **Embeddings not versioned** — Only the source text is versioned; embeddings are regenerated from the current content.

## Alternatives

1. **Application-level versioning** — Rejected because it requires every edit path to manually create versions, which is error-prone.
2. **Diff-based versioning (json_patch)** — Rejected because full snapshots are simpler to implement, query, and restore from. Storage cost is acceptable for the expected volume (~hundreds of sources).
3. **Temporal tables (pg_temporal)** — Rejected because the extension is not available in Supabase managed PostgreSQL.
4. **Audit log only** — Rejected because `audit_logs` stores JSONB diffs, not the full content, making restoration difficult.

## References

- Migration: `supabase/migrations/20260227000011_add_knowledge_audit_log.sql`
- Base table: `supabase/migrations/20260221000011_create_knowledge_tables.sql`
- Related: AI package documentation in `packages/ai/README.md`
