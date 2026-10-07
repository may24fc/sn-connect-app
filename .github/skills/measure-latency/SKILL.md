---
name: measure-latency
description: "Use whenever improving, optimizing, auditing, or speeding up any SN Connect feature's latency, load time, perceived speed, API response time, auth/session overhead, database query cost, or page performance. Requires numeric before/after p50/p95 measurements recorded in the feature's optimization.md. Triggers: make it faster, reduce latency, optimize performance, slow page, speed up, perf fix, measure improvement."
argument-hint: "Feature slug and the routes or operations being optimized"
user-invocable: true
disable-model-invocation: false
---

# Measure Latency Improvements

Every latency-related change must produce **numbers**: a baseline before the change, a result after it, and the delta. The user treats these measurements as important evidence. Never report a performance improvement as "faster" without measured milliseconds. If measurement is genuinely impossible, record why and the exact command to run later.

Full reference: [docs/guides/latency-measurement.md](../../../docs/guides/latency-measurement.md).

## Tooling

| Tool | Purpose |
| --- | --- |
| `pnpm performance:latency` | Live sampler. It signs in, issues interleaved read-only GETs, and saves p50/p95 for total time, TTFB, and every `Server-Timing` metric. |
| `pnpm performance:latency --log <file>` | Summarizes structured `[<scope>-timing]` server events. |
| `pnpm performance:latency --compare <before.json> <after.json>` | Prints the before/after delta table for the optimization record. |
| [`apps/web/src/lib/observability/timing.ts`](../../../apps/web/src/lib/observability/timing.ts) | `startTiming`, `recordTiming`, `appendServerTiming` for instrumenting a phase. |

Raw runs are saved to `perf-results/<feature>/` (gitignored). Summarized tables go into the feature's `optimization.md`.

## Workflow

1. **Read context.** Read `docs/features/<feature-slug>/task-tracker.md` and `optimization.md` and reuse any existing baseline or targets.
2. **Pick targets.** List the page routes and read-only `GET` APIs that the change affects. Add one unaffected control route so environmental drift is visible. Use `--preset auth` for authentication work.
3. **Confirm the environment.** Both environments are preconfigured (see the guide's Environment Setup section):
   - **Local:** `pnpm performance:latency` uses `apps/web/.env.local`, which holds the local sample admin.
   - **Production:** `pnpm performance:latency:prod` uses the `latency-bench@example.com` admin account stored in `apps/web/.env.local.prodops`. Run it only when the user explicitly asks, with side-effect-free targets.
   - If sign-in fails, re-provision the account with the commands in the guide rather than borrowing a real person's credentials.
   - Every target must return 2xx.
4. **Capture the baseline before editing code.**

   ```powershell
   pnpm performance:latency --feature <feature-slug> --targets "/page,/api/x" --label before
   ```

   If the change has already been made, measure the previous commit from a separate worktree (`git worktree add ..\sn-baseline <commit>`) running on a different port with `--base-url`, or state that no baseline exists.
5. **Instrument when totals are not specific enough.** Wrap the phase being optimized with `recordTiming({ scope, layer, operation, route, startedAt })` and expose it with `appendServerTiming` where a response object is available. Use route templates only; never log user IDs, emails, query values, or record IDs.
6. **Implement the change**, then rerun the identical command with `--label after` against the same server mode (dev vs `next start`) and the same user.
7. **Compare.**

   ```powershell
   pnpm performance:latency --compare perf-results\<feature>\<before>.json perf-results\<feature>\<after>.json
   ```

8. **Record the results** in `docs/features/<feature-slug>/optimization.md` under the entry's `Measurements` section. Include the date, commits, environment (dev/prod build, local Supabase), user role, samples/warmup, the comparison table, and an interpretation. Mention status-code anomalies. Update the task tracker's validation note with the headline delta.

## Rules

- Use the same targets, user, server mode, sample count, and machine for before and after runs. Use at least 30 samples and 3 warmups unless the route is expensive.
- Prefer a production build for publishable local numbers: run `pnpm performance:serve` (port 3101, separate `.next-perf` output, so it can run alongside `pnpm dev:web`) and pass `--base-url http://localhost:3101`. Dev-server numbers are acceptable for local direction but must be labelled `next dev`.
- Report p50 and p95. Treat deltas smaller than the run-to-run noise of the control route as inconclusive.
- Requests must be read-only. Do not benchmark mutations against shared data; measure them with `recordTiming` and `--log` during normal manual testing instead.
- A latency task is not `Done` until numbers are recorded or the `Deferred`/`Blocked` reason and the resume command are written.
