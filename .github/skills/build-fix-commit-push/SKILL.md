---
name: build-fix-commit-push
description: "Use when asked to run the build, fix build errors, commit changes by feature, and push a SN Connect branch. Triggers: build and push, fix errors then commit, feature commits, verify before push, or publish current changes."
argument-hint: "Optional branch or scope; defaults to the current branch and all pending changes"
user-invocable: true
disable-model-invocation: false
---

# Build, Fix, Commit, Push

Complete the requested delivery workflow end to end for this pnpm/Turborepo repository. Preserve unrelated user changes and never apply database migrations or deploy application code unless explicitly requested.

## Preflight

1. Read the applicable `AGENTS.md` files and any feature tracker at `docs/features/<feature-slug>/task-tracker.md` before changing feature code.
2. Record the current branch, worktree state, and unpublished commits:

   ```powershell
   git branch --show-current
   git status --short
   git log --oneline origin/main..HEAD
   ```

3. Treat pre-existing changes as user work. Do not revert, discard, or reformat them merely to obtain a clean worktree.
4. When the requested changes affect a feature, create or update its task tracker before finishing. Mark a task `Done` only after its focused validation passes.

## Build And Diagnose

1. Select the narrowest requested build scope:

   ```powershell
   # Default: validate the full monorepo
   pnpm build

   # When the user says "only build apps/web" or requests the web app only
   pnpm --filter @hr-portal/web build
   ```

2. If it succeeds, do not make speculative source edits. Proceed to commit planning, or finish immediately when the request was build-only.
3. If it fails, identify the first owning source file or configuration surface from the diagnostic. Form one falsifiable local hypothesis and choose the smallest test or scoped build that can disprove it.
4. Make the smallest root-cause fix. Preserve strict TypeScript and existing project patterns; do not add `any`, broad suppressions, or unrelated refactors.
5. Immediately run the focused validation after each substantive edit. Use a nearby unit test first, then a scoped package build or typecheck when no focused test exists.
6. Repeat only until the originally requested build scope passes. If a pre-existing unrelated failure remains, do not conceal it; report its cause, affected scope, and the next repair step.

## Plan Feature Commits

1. Re-check `git status --short` after validation.
2. Group changed paths by independently understandable product feature, plus separate `chore` groups for generated artifacts, tooling, and documentation when they are not intrinsic to a feature.
3. When versioned Graphify output is present, commit it by default in its own `chore(graphify)` commit. Inspect ambiguous new folders or generated files before staging, and keep ignored caches and secrets out of commits.
4. Stage each group with explicit paths. Do not use `git add .` or `git add -A` unless the user explicitly requests one all-in commit and every changed file has been reviewed.
5. Use Conventional Commit-style messages:

   ```text
   feat(scope): concise user-facing change
   fix(scope): concise correction
   refactor(scope): behavior-preserving restructure
   chore(scope): tooling or generated artifact update
   ```

6. Include migrations with their owning feature commit, never as an accidental catch-all. Migrations are append-only; do not modify previously applied migration files.

## Validate Committed Work

1. After each substantive feature commit, run its narrowest relevant test or validation. If it fails, fix only that same feature slice and amend or add a follow-up commit as appropriate.
2. Before pushing, require all of the following:
   - the requested build scope passed during this workflow (`pnpm build` by default, or `pnpm --filter @hr-portal/web build` for web-only requests);
   - focused checks for modified behavior passed where tests exist;
   - `git status --short` is empty, excluding intentionally ignored tool caches;
   - `git log --oneline origin/main..HEAD` contains the expected commits.

## Push And Verify

1. Push the current branch explicitly:

   ```powershell
   git push origin <branch>
   ```

2. If the push succeeds, report the branch and commit IDs.
3. If the push hangs or fails, do not claim it was pushed. Compare remote and local revisions:

   ```powershell
   git ls-remote origin refs/heads/<branch>
   git rev-parse HEAD
   ```

4. Retry once only when the failure is plausibly transient. For a repeated timeout, HTTP 408, or stalled transfer, preserve local commits and report that the remote revision differs from local `HEAD`, along with the network remediation needed.

## Completion Criteria

The workflow is complete only when the build and relevant focused validations pass, every intended change is committed in a coherent group, the worktree is clean, and the remote branch is verified at the local commit. If the network prevents the last condition, state that push is blocked and provide the exact local and remote commit IDs.
