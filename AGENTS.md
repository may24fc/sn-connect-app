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

## Feature Task Tracking

For every session that implements, investigates, or defers work for a feature, create or update its durable tracker at `docs/features/<feature-slug>/task-tracker.md` before ending the session.

- Treat a feature as a coherent product or technical area, such as `pa-task-tracker` or `marketing-reporting`; reuse its existing tracker instead of creating a second one.
- Record every task with exactly one status: `Done`, `In Progress`, `Deferred`, `Skipped`, or `Blocked`.
- For `Deferred`, `Skipped`, and `Blocked` tasks, record the reason, relevant evidence or dependency, and the next condition that would allow work to resume.
- For completed work, record the date, changed paths, and validation performed. Do not claim a task is done until its focused validation has passed.
- Add a dated session-history entry summarizing decisions, remaining work, and known risks. Keep the tracker factual and update it as implementation changes.
- At the beginning of a later session about that feature, read its tracker before planning or editing so completed and deferred work is not rediscovered or duplicated.

Use this structure:

```markdown
# <Feature Name> Task Tracker

## Current Status

## Tasks

### Done
- [x] Task - date; changed paths; validation

### In Progress
- [ ] Task - current state and next action

### Deferred
- [ ] Task - reason; resume condition

### Skipped
- [ ] Task - reason; reconsider when

### Blocked
- [ ] Task - blocker; owner or dependency

## Session History
- YYYY-MM-DD: decision, completed work, validation, and remaining risk
```

## Feature Optimization Records

For any feature where performance, perceived latency, reliability, complexity, bundle size, database cost, or user-flow friction is audited, planned, or changed, create or update `docs/features/<feature-slug>/optimization.md` alongside its task tracker.

- Reuse the feature's existing optimization record; do not create separate optimization documents for the same feature.
- Read the record before continuing optimization work and update it before ending the session.
- Record both implemented and non-implemented work. Each entry must state its status (`Implemented`, `Planned`, `Audited`, or `Deferred`), the problem/evidence, the proposed or delivered solution, relevant code paths, and validation or a resume condition.
- Maintain a **Relevant Code Map** with Markdown links to the source files and tests affected by each optimization area.
- Include a concise **Visual Guide** using Mermaid whenever a flow spans three or more stages, crosses application layers, or involves a material security/performance tradeoff. Do not add decorative visuals for one-step changes.
- Keep a dated change log so readers can distinguish what was measured, reviewed, implemented, and still pending.
- Link the optimization record from the feature's `task-tracker.md`, and keep the tracker and optimization record factually consistent.
