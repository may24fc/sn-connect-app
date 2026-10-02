# SN Connect Development Guide

Use `AGENTS.md` and Graphify for repository architecture, code relationships, and feature discovery. This file contains only operating constraints that are not reliably inferred from the codebase.

## Product Boundary

SN Connect is a pnpm + Turborepo monorepo for the Control Hub internal portal (`apps/web`, port 3001) and the SN Group public website (`apps/www`, port 3000). Shared packages are in `packages/`; Supabase provides PostgreSQL, RLS, Storage, and pgvector.

## Engineering Rules

- TypeScript is strict. Do not use `any`; use `unknown` with type guards.
- Prefer Server Components. Add `'use client'` only for browser APIs, hooks, or event handlers.
- Validate every API input with Zod. Resolve authenticated users through the domain `_lib.ts` helper and use the RLS-scoped Supabase client by default.
- RLS is the security boundary. Use `createSupabaseAdminClient` only with an explicit server-side role or access-grant check.
- Audit sensitive operations. Never log PII, payroll, bank, medical, or credential data.
- Migrations are append-only. Add a timestamped migration; never edit an applied migration.
- Use existing query keys, API error helpers, and UI primitives. Internal navigation uses `Link` or `router.push`, never `<a href>` or `window.location`.

## Environment Safety

- Use local Supabase for development and migration validation.
- Target production only when explicitly requested. Do not use staging unless explicitly asked to resume staging work.
- Backfill scripts are dry-run by default. Never run an `:apply` command against production without explicit approval.
- Before changing client mutation or cache behavior, read `docs/apps/web/architecture/optimistic-ui.md` and classify the mutation as optimistic or server-confirmed.

## Feature Task Tracking

For every feature that is implemented, investigated, or deferred, maintain `docs/features/<feature-slug>/task-tracker.md`.

- Read the tracker before continuing a feature, and update it before ending the session.
- Each task is exactly one of `Done`, `In Progress`, `Deferred`, `Skipped`, or `Blocked`.
- `Done` entries include date, changed paths, and validation. Deferred, skipped, and blocked entries include the reason and resume condition.
- Add a dated session-history entry with decisions, validation, remaining work, and known risks.
- Trackers record factual handoff state; they do not replace `CHANGELOG.md`, ADRs, or implementation documentation.

## Feature Optimization Records

For feature-level optimization work, maintain `docs/features/<feature-slug>/optimization.md` alongside the task tracker.

- Use it for audited, planned, implemented, and deferred improvements to performance, latency, reliability, complexity, bundle size, database cost, or user-flow friction.
- Read it before resuming optimization work; update it before ending the session.
- Each entry records status, evidence/problem, solution or plan, relevant code/test paths, validation, and a resume condition when deferred.
- Include a linked code map and a dated change log. Use concise Mermaid diagrams for multi-stage, cross-layer, or security/performance tradeoff flows when they improve Markdown preview comprehension.
- Keep `optimization.md` and `task-tracker.md` linked and factually consistent; the tracker remains the authoritative task-status handoff.

## Essential Commands

```bash
pnpm dev              # public website, :3000
pnpm dev:web          # Control Hub, :3001
pnpm dev:all          # both apps
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e:local
pnpm supabase:start
pnpm supabase:status
pnpm db:migrate
pnpm db:generate
```

## Known Risks

- Portal API routes do not yet have global rate limiting.
- Test coverage is sparse relative to the product surface.
- The Capacitor mobile app is a skeleton.
- `JWT_SECRET` remains in the config schema although runtime auth uses Supabase Auth.
- `supabase/functions/transcribe-recording/index.ts` uses the legacy Anthropic `max_tokens_to_sample` parameter; the Messages API requires `max_tokens`.
