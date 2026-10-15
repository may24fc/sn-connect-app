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

## Proportional Validation

Keep post-change validation proportional to the risk and scope of the change. Prefer the smallest focused check that can catch a likely regression, and do not run the full repository test suite or build by default.

- For instruction-only, documentation-only, comment-only, or other non-runtime edits, review the diff and check links or formatting when relevant. Do not run code tests, builds, Playwright, latency measurements, graph updates, or create a feature tracker solely for those edits.
- For a small localized code change, run the nearest relevant test, lint/type check, or package-scoped command. One focused validation is normally enough when the change does not cross a contract or application boundary.
- Add broader checks only when the change affects shared packages, public types or APIs, authentication/authorization, database behavior, build configuration, multiple applications, or a critical user flow, or when the focused check reveals a wider issue.
- Do not run multiple checks that provide substantially duplicate coverage. Do not add tests for a trivial change unless the behavior is regression-prone or the user asks for them.
- Report exactly what was validated and any meaningful check that was intentionally skipped. Do not describe an unvalidated change as fully verified.

## Feature Task Tracking

For substantive feature work that spans multiple tasks or sessions, implements a product capability, or leaves meaningful follow-up work, create or update its durable tracker at `docs/features/<feature-slug>/task-tracker.md` before ending the session.

Do not create or update a feature tracker for quick fixes, small localized refactors, routine maintenance, instruction/prompt changes, documentation-only work, or read-only questions unless the work belongs to an already tracked feature and materially changes its status.

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

Create or update `docs/features/<feature-slug>/optimization.md` when the task explicitly audits or optimizes performance, perceived latency, reliability, complexity, bundle size, database cost, or user-flow friction, or when a substantive feature effort makes a material tradeoff in one of those areas. Routine implementation and cleanup do not require an optimization record.

- Reuse the feature's existing optimization record; do not create separate optimization documents for the same feature.
- Read the record before continuing optimization work and update it before ending the session.
- Record both implemented and non-implemented work. Each entry must state its status (`Implemented`, `Planned`, `Audited`, or `Deferred`), the problem/evidence, the proposed or delivered solution, relevant code paths, and validation or a resume condition.
- Maintain a **Relevant Code Map** with Markdown links to the source files and tests affected by each optimization area.
- Include a concise **Visual Guide** using Mermaid whenever a flow spans three or more stages, crosses application layers, or involves a material security/performance tradeoff. Do not add decorative visuals for one-step changes.
- Keep a dated change log so readers can distinguish what was measured, reviewed, implemented, and still pending.
- Link the optimization record from the feature's `task-tracker.md`, and keep the tracker and optimization record factually consistent.

## Latency Measurement

Measured numbers are required when the task's goal is to improve latency, load time, API response time, auth/session overhead, or query cost, or when reporting that a change made one of those metrics faster. Routine changes that may have only incidental performance effects do not require latency measurement. For measured work, use the `measure-latency` skill (`.github/skills/measure-latency/SKILL.md`) and [docs/guides/latency-measurement.md](docs/guides/latency-measurement.md).

- Capture a baseline with `pnpm performance:latency --label before` **before** editing code, then rerun the identical command with `--label after` and use `--compare` for the delta table.
- Record p50/p95 before, after, and delta, plus date, commit, environment, user role, and sample count in the feature's `optimization.md` `Measurements` section. Summarize the headline delta in the task tracker.
- Instrument narrower phases with `apps/web/src/lib/observability/timing.ts` (`recordTiming`, `appendServerTiming`) when totals are not specific enough. Never log PII or record IDs.
- Do not describe a change as faster without numbers. If measurement is impossible, record why and the exact command to run later; the task stays `Deferred` or `Blocked`, not `Done`.
- Measure against local services only, unless the user explicitly requests production measurement.

## UI/UX Reference Review

For a UI/UX audit, plan, or material redesign of a user-facing screen or workflow, read and use `.github/skills/ui-ux-reference-review/SKILL.md`. Small copy, spacing, color, or localized component changes do not require the reference review. Ground recommendations in the current app and verified, relevant product references; keep review-only requests read-only. This complements, and does not replace, the Playwright verification rules below.

## UI Verification With Playwright

Every UI change under `apps/web` or `apps/www` that alters rendered output or client interaction must receive focused browser verification with Playwright before it is reported as done. Match the depth of verification to the change:

- For copy, styling, or a small localized visual change, load the affected route at the most relevant viewport and role, inspect the changed state, check for new console errors, and take one screenshot. A full state matrix is not required.
- For an interaction or responsive-layout change, exercise the affected interaction and verify the relevant desktop and mobile states. Test empty, loading, error, long-content, dark-mode, and additional-role variants only when the change can reasonably affect them.
- For a critical or cross-cutting user flow, perform the broader audit below and add or update an `e2e/` Playwright spec when durable regression coverage is warranted.

Type-checks and unit tests do not replace browser verification, but avoid duplicating unrelated browser coverage.

- Agents may start a local dev server when that is the most direct way to run Playwright. Do not target production or staging; use local Supabase.
  - Control Hub: `pnpm dev:web` (port 3001) or `pnpm dev:web:e2e` (port 3002, mock auth enabled). Public site: `pnpm dev` (port 3000).
  - `pnpm dev:web:e2e` deletes `apps/web/.next` on start; do not run it while another web dev server is using that directory.
  - Reuse a server that is already running on the port. Stop any server you started before ending the session.
- Drive the changed screen with the Playwright tool or MCP available in the session, or with a focused spec under `e2e/` run via `pnpm test:e2e:local` (for example `pnpm exec playwright test --config playwright.local.config.ts <spec>`). Do not run all E2E specs when one route or focused spec covers the change. Existing audit specs: `e2e/web-ui-audit.spec.ts`, `e2e/www-ui-audit.spec.ts`, `e2e/ui-consistency-agent/`.
- For critical or cross-cutting flows, audit beyond a smoke test:
  - Load the changed route as each affected role and confirm there are no console errors or failed network requests.
  - Exercise the changed interaction end to end, including empty, loading, error, and long-content states.
  - Check desktop (about 1440px) and mobile (about 390px) viewports for overflow, clipping, and overlap, and check dark mode if the screen supports it.
  - Take screenshots of the changed states and look at them before concluding. Save them under the Playwright output or scratch directory, not in tracked source folders.
- When a change adds or materially alters a critical user flow, add or update a Playwright spec in `e2e/` instead of relying on a one-off manual run.
- If a change cannot be verified in the browser (missing credentials, a blocked local stack, an unavailable route), say so explicitly, state the reason and the exact command to run later, and do not mark the task `Done`.
- When the work requires a feature tracker, record the verification there: routes and roles checked, viewports, the spec or command used, and the result.
