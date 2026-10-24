# Performance Reflection Insights Optimization Record

## Current Status

Ask AI answers questions about 5% reflections by sending one compact, budgeted text block per question instead of using vector retrieval. People appear in that block only as tokens, restored to names on the server. Deterministic statistics are computed in code before the model sees the data. The stream starts after auth, a rate-limit count, a context build of about 50 ms, and a single question insert. Time to first token is dominated by the model (p50 about 1.1 s locally).

Task status lives in [task-tracker.md](./task-tracker.md).

## Relevant Code Map

- [Source loader](../../../apps/web/src/lib/performance/insights/source.ts) - window months, row parsing, PII redaction, unique person labels, RLS-client reflection load.
- [Pseudonymizer](../../../apps/web/src/lib/performance/insights/pseudonymize.ts) - person and mention tokens, name replacement in text, streaming token restoration.
- [Mention detection](../../../apps/web/src/lib/performance/insights/mentions.ts) - unknown names via capitalization plus a cached compromise lexicon lookup.
- [Personal details](../../../apps/web/src/lib/performance/insights/personal-details.ts) - links, handles, ID numbers, addresses, birth dates.
- [Policy fix migration](../../../supabase/migrations/20261025000002_fix_performance_evaluation_policy_roles.sql) - valid roles on the five performance evaluation tables.
- [Statistics](../../../apps/web/src/lib/performance/insights/stats.ts) - monthly aggregates, per-person deltas and flags, pending roster.
- [Renderer](../../../apps/web/src/lib/performance/insights/render.ts) - tagged text, escaping, truncation levels L0–L3, prior-month modes P0–P2, snapshot hash.
- [Prompt](../../../apps/web/src/lib/performance/insights/prompt.ts) - guardrails before data for a cacheable prefix.
- [History replay](../../../apps/web/src/lib/performance/insights/history.ts) - clipped, budgeted, database-sourced history.
- [Answer stream](../../../apps/web/src/lib/performance/insights/answer-stream.ts) - SSE frames, persistence, metadata-only audit and tracing.
- [Chat route](../../../apps/web/src/app/api/performance/insights/chat/route.ts) - guard, validation, rate limit, timing, Server-Timing.
- [Shared evaluation sources](../../../apps/web/src/lib/performance/evaluation-sources.ts) - source config and PII redaction shared with the summary.
- [Streaming helper](../../../packages/ai/src/chat.ts) - `streamCompletion`.
- [Panel](../../../apps/web/src/components/performance/insights/ReflectionInsightsPanel.tsx) and [hooks](../../../apps/web/src/hooks/usePerformanceInsights.ts) - lazy panel, optimistic rename/delete, server-confirmed streaming.
- Tests: [context](../../../tests/lib/performance-insights-context.test.ts), [chat route](../../../tests/api/performance-insights-chat-route.test.ts), [conversation routes](../../../tests/api/performance-insights-conversations-route.test.ts), [stream helper](../../../tests/lib/ai-stream-completion.test.ts), [RLS](../../../tests/sql/performance-insights-rls-local.sql), [Playwright](../../../e2e/performance-reflection-insights.spec.ts).

```mermaid
flowchart LR
  A[POST /chat] --> B[Admin role check]
  B --> C[Rate-limit count]
  C --> D[Load window RLS<br/>+ audience admin]
  D --> P[Details → placeholders<br/>names → tokens]
  P --> E[Stats in code]
  E --> F[Render within budget]
  F --> G[Save question]
  G --> H[Stream gpt-5.4-mini<br/>tokens only]
  H --> R[Tokens → names<br/>server side]
  R --> I[Save answer + hash]
  I --> J[Audit + trace<br/>metadata only]
```

## Optimizations

### Whole-window context instead of vector retrieval

- **Status:** Implemented
- **Problem/evidence:** Questions such as "who rated family below 5?" or "who hasn't submitted?" need every row. Top-k vector retrieval returns only the closest chunks and would silently undercount.
- **Solution:** Send the whole selected month (shortened step by step if needed, never dropping a person) plus condensed earlier months, preceded by code-computed statistics and the pending roster. Budget about 64k input tokens: stats ≤ 4k, selected month 40k, prior months 12k, history 6k; output ≤ 1.5k.
- **Code paths:** `apps/web/src/lib/performance/insights/render.ts`, `stats.ts`, `config.ts`.
- **Validation:** 80 people with maximum-length answers stay within budget with all 80 present; prior months condense P0 → P1 → P2; real-stack answers quoted the correct rank change (7 → 3) from the stats block.

### Cacheable prompt prefix

- **Status:** Implemented (not separately measured)
- **Problem/evidence:** Follow-up questions resend the same large data block.
- **Solution:** Guardrails and the data block form the system message ahead of the history, and the rendering is deterministic, so the prefix is identical across follow-ups and eligible for OpenAI's automatic prompt caching.
- **Validation:** Determinism is covered by the context test (identical text and hash on repeat renders). Cache hit rates were not measured; resume by recording `cached_tokens` from the usage payload if cost or TTFB becomes a concern.

### Lazy panel loading

- **Status:** Implemented
- **Problem/evidence:** The panel, markdown, and streaming code are only needed after a click.
- **Solution:** `next/dynamic` with `ssr: false`, mounted only after the first open, then kept mounted to preserve state.
- **Validation:** Host-page sampling showed no attributable change (see Measurements).

### Linear-time PII redaction for long unbroken text

- **Status:** Implemented
- **Problem/evidence:** The shared email-redaction regex backtracks quadratically on long runs with no `@`. An 80-person test with 2000-character unbroken fields took 11.5 s.
- **Solution:** Skip the email pattern when the text contains no `@`; output is identical.
- **Code paths:** `apps/web/src/lib/performance/evaluation-sources.ts`.
- **Validation:** The same test now runs inside a 222 ms test file (all 11 context tests). Existing summary tests still pass.

### Names replaced with tokens before the model

- **Status:** Implemented
- **Problem/evidence:** Sending named work, family, and personal reflections to OpenAI needed sign-off. Names are the most direct identifier in the prompt.
- **Solution:** Each known person gets a stable token (`Person-07`) assigned in display-label order, so tokens and the prompt prefix stay stable across turns. Labels, full names, and unique first or last names are replaced in reflection text, the question, and replayed history. Common-word names alone are never replaced, and shared names become `[teammate]`. A stream restorer swaps tokens back to labels on the server, holding back any partial token at a chunk boundary, so the browser and database get real names while OpenAI gets only tokens. Departments, ranks, and other text are still sent; unknown names in free text are not detected.
- **Tradeoff:** Tokens slightly lengthen the prompt and add two regex passes per text field. The model must cite tokens exactly; if it invents a token that doesn't exist, the token is shown unchanged rather than mapped to anyone.
- **Code paths:** `apps/web/src/lib/performance/insights/pseudonymize.ts`, `apps/web/src/app/api/performance/insights/chat/route.ts`, `apps/web/src/lib/performance/insights/answer-stream.ts`, `apps/web/src/lib/performance/insights/prompt.ts`.
- **Validation:** `tests/lib/performance-insights-pseudonymize.test.ts` 6/6 and chat-route tests; in real-stack runs no raw token reached the page and names were restored, including a colleague named only inside free text.

### Fast mention detection

- **Status:** Implemented
- **Problem/evidence:** Detecting names that the app doesn't know needs NLP. Running compromise over every reflection's full text, plus a sentence-start check that re-scanned the text before every match, took **p50 9641 ms** to pseudonymize 320 large reflections (80 people × 4 months, about 5 KB each; 10 runs after 2 warmups).
- **Solution:** Use compromise only to decide whether a capitalized word at the start of a sentence is a name, cache that answer per word (bounded at 5000 entries), and find sentence starts with a backwards character scan. Capitalized words mid-sentence are caught without NLP.
- **Code paths:** `apps/web/src/lib/performance/insights/mentions.ts`.
- **Validation:** Same benchmark after the change: **p50 280.5 ms**, max 354.1 ms for 320 large reflections; p50 50.4 ms for 120 typical reflections (30 people, about 2 KB each). Detection tests still pass. The first request after a server start also loads the compromise lexicon, which shows up in the p95 below.

## Measurements

Environment: local, `next dev` on :3001, local Supabase, admin bench account, 2026-10-24, commit `7aadf560` (dirty working tree with this feature and unrelated uncommitted work).

### Chat stream (new endpoint, no baseline)

`LATENCY_TIMING_ENABLED=true` server log, 10 real questions (2 via the UI, 8 via the authenticated API), summarized with `pnpm performance:latency --log`:

| Phase | n | p50 ms | p95 ms |
| --- | ---: | ---: | ---: |
| Auth and role (`insight_timing api auth`) | 11 | 157.5 | 257.8 |
| Load and render context | 10 | 52.5 | 115.1 |
| Save question | 10 | 33.5 | 52.4 |
| Time to first token (from request start) | 10 | 1105.1 | 2596.1 |
| Stream total (model call) | 10 | 1453.7 | 2665.6 |

The auth row has 11 samples because the first attempt failed after auth (RLS policy bug, since fixed).

### Chat stream after token replacement and the RLS read

Same environment, a fresh `LATENCY_TIMING_ENABLED=true` server, 28 questions across three real-stack runs (UI plus API):

| Phase | n | p50 ms | p95 ms | Earlier p50 / p95 |
| --- | ---: | ---: | ---: | --- |
| Auth and role | 28 | 102.0 | 218.9 | 157.5 / 257.8 |
| Load, pseudonymize, and render context | 28 | 23.5 | 53.5 | 52.5 / 115.1 |
| Save question | 28 | 21.3 | 75.6 | 33.5 / 52.4 |
| Time to first token | 28 | 1065.2 | 1811.3 | 1105.1 / 2596.1 |
| Stream total | 28 | 1476.5 | 2717.0 | 1453.7 / 2665.6 |

**Interpretation:** no slowdown is visible from token replacement. The context phase got faster, but that comparison is confounded: the reflection read moved from the admin client to the RLS client and the second server was warmer. The cost of token replacement alone was not isolated. Time to first token is still dominated by the model.

### Chat stream with mention detection

Fresh `LATENCY_TIMING_ENABLED=true` server, 11 real questions (3 via the UI, 8 via the API):

| Phase | n | p50 ms | p95 ms | Before mentions p50 / p95 |
| --- | ---: | ---: | ---: | --- |
| Load, pseudonymize, and render context | 11 | 41.2 | 273.7 | 23.5 / 53.5 |
| Time to first token | 11 | 1318.1 | 2400.4 | 1065.2 / 1811.3 |
| Stream total | 11 | 1703.7 | 2488.9 | 1476.5 / 2717.0 |

**Interpretation:** mention detection adds about 18 ms at p50 to the context step with this small dataset; the p95 includes the first request's lexicon load. Model time varies run to run and still dominates; the time-to-first-token difference is within that variation and not attributable to detection.

### List endpoint (new, no baseline)

`GET /api/performance/insights/conversations?evaluationKind=five_percent`, 30 samples, 3 warmup: p50 336.7 ms, p95 517.4 ms.

### Host page

Baseline `perf-results/performance-reflection-insights/2026-10-24T06-36-23-434Z-before.json`, compared with `…07-46-57-932Z-after-quiet.json` (30 samples, 3 warmup each):

| Metric | Before p50 | After p50 | Δ p50 | Before p95 | After p95 | Δ p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Review page total | 678.9 | 824.4 | +145.5 | 1025.9 | 1287.4 | +261.6 |
| Admin reflections API total | 280.9 | 251.4 | −29.5 | 423.0 | 558.3 | +135.3 |
| Control: notifications total | 297.6 | 335.8 | +38.2 | 520.2 | 921.1 | +400.9 |

The control route moved too, so a back-to-back A/B on the same server was run by swapping only the host component:

| Order | HEAD page p50 | Change page p50 | HEAD control p50 | Change control p50 |
| --- | ---: | ---: | ---: | ---: |
| HEAD first | 624.4 | 862.0 | 258.7 | 324.4 |
| Change first | 689.3 | 593.9 | 315.1 | 233.1 |

Whichever variant ran second (after a hot reload) was slower, including the control. **Interpretation: inconclusive; no regression is attributable to this feature.** The panel is lazily loaded and renders nothing on the server. For publishable numbers, rerun with `pnpm performance:serve` (production build, :3101) and `--base-url http://localhost:3101`.

## Change Log

- 2026-10-24: Initial implementation, verification, and measurements (see tracker). Switched the reflection read to the admin client after finding the existing reflections RLS policy fails for admins.
- 2026-10-24: Added token replacement for names; fixed the performance evaluation policies (`20261025000002`, local) and moved the reflection read back to the RLS client; re-measured the chat stream.
- 2026-10-24: Added mention and personal-detail tokenization; cut detection cost from 9.6 s to 281 ms for 320 large reflections; applied `20261025000002` and `20261025000003` to production.
