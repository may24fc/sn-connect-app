## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Run graphify update . only after substantial repository changes, not after small instruction-only edits.
- Skip graphify updates for AGENTS.md-only edits, prompt text tweaks, and other metadata/doc touchups that do not materially change architecture or code relationships.
- Trigger graphify update . when either of these is true:
	- 5 or more source files changed across apps/, packages/, supabase/, scripts/, or n8n/workflows/.
	- Any structural change such as new/removed modules, route handlers, database migrations, workflow definitions, or cross-cutting architecture docs that affect system relationships.

## Supabase Environments

For now, treat **local** and **production** as the only active Supabase targets.

- Use the local Supabase stack for development, migration validation, and manual testing.
- Apply production migrations only when the user explicitly requests a production deployment.
- Do not target, switch to, deploy to, or validate against staging unless the user explicitly asks to resume staging work.
- Before any database-changing command, state the target environment and use an explicit local or production command/path rather than relying on an implicit linked project.

## Cross-Cutting Frontend Rollouts

- Before adding or changing client mutation/cache behavior, read `docs/apps/web/architecture/optimistic-ui.md`.
- Classify every user-initiated mutation as optimistic or server-confirmed using that document. Keep its implementation-status table current whenever a rollout area changes.
