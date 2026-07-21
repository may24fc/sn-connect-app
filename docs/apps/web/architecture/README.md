# Architecture Overview

> Audience: Developers, DevOps

Control Hub is an enterprise HR Portal with an AI agent, deployed as a pnpm monorepo with a three-tier architecture.

**Tagline:** "Where Policy Meets Productivity"

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Interface Layer                          │
│  Next.js 15 (App Router) + React 19     Capacitor (mobile)  │
│  apps/web/                               apps/mobile/        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS / SSE
┌───────────────────────▼─────────────────────────────────────┐
│                   Orchestration Layer                         │
│  API Routes (apps/web/src/app/api/)                          │
│  Supabase Edge Functions (supabase/functions/)               │
│  n8n Workflows (n8n/workflows/) — archived/deferred          │
└───────────────────────┬─────────────────────────────────────┘
                        │ PostgreSQL / Storage / Auth
┌───────────────────────▼─────────────────────────────────────┐
│                      Data Layer                              │
│  Supabase PostgreSQL + pgvector     Supabase Storage         │
│  RLS policies (26+)                Storage buckets (3)       │
│  Edge Functions                    Auth (PKCE)               │
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      AI Layer                                │
│  Anthropic Claude (claude-sonnet-4-5-20250929) — chat        │
│  OpenAI text-embedding-3-small — embeddings                  │
│  pgvector — vector similarity search                         │
│  packages/ai/ — SDK wrappers                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
sn-hr-portal/
├── apps/
│   ├── web/            # Next.js 15 application (primary)
│   └── mobile/         # Capacitor wrapper (skeleton)
├── packages/
│   ├── ui/             # Shared UI components (100+)
│   ├── database/       # Supabase types, branded IDs, enums
│   ├── ai/             # Claude + OpenAI SDK wrappers
│   ├── auth/           # Auth utilities
│   └── config/         # Env validation (Zod)
├── supabase/
│   ├── migrations/     # 62 SQL migration files
│   ├── functions/      # Edge Functions
│   └── seed/           # Seed data
├── e2e/                # Playwright E2E tests
├── tests/              # Vitest unit tests
├── docs/               # Documentation
└── n8n/                # Workflow automation (planned)
```

---

## Request Flow

### Authenticated Page Request

```
Browser → Next.js Middleware → Supabase Session Check
  ├─ No session → Redirect to /login
  ├─ Incomplete onboarding → Redirect to /onboarding/setup
  ├─ Associate without internship → Redirect to /associate/setup (admin assignment guidance)
  └─ Valid session → Render page (Server Component)
       └─ Client Components fetch data via TanStack Query
            └─ API routes → Supabase with RLS → Response
```

### API Request Flow

```
Client (fetch/TanStack Query)
  → Next.js API Route Handler
    → Parse cookies → Create Supabase client (user context)
    → Validate input (Zod schema)
    → Check role (admin/super_admin where needed)
    → Query Supabase (RLS enforced automatically)
    → Return JSON response
```

### AI Chat Flow

```
User message → /api/ai/chat
  → OpenAI text-embedding-3-small → 1536-dim vector
  → Supabase RPC: match_knowledge_embeddings
    (similarity threshold: 0.5, max: 5 chunks)
  → Assemble context from matched chunks
  → Anthropic Claude with system prompt + context
  → Stream response via SSE (text_delta events)
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Server Components by default | SEO, performance, smaller bundles |
| Data fetching | TanStack Query (client) | Caching, deduplication, optimistic updates |
| Auth | Supabase Auth PKCE | Proven, handles tokens/refresh automatically |
| Authorization | RLS as final gatekeeper | Defense in depth — app checks are secondary |
| Styling | Tailwind + CVA | Consistent design tokens, type-safe variants |
| IDs | Branded types | Compile-time safety, prevents ID misuse |
| Forms | React Hook Form + Zod | Type-safe validation, good DX |
| AI | RAG with pgvector | Context-aware responses from company knowledge |

---

## Security Model

### Defense in Depth

```
Layer 1: Next.js Middleware    — Route protection, session refresh
Layer 2: API Route Handlers    — Role checks, input validation
Layer 3: Supabase RLS          — Row-level access control (final authority)
Layer 4: Audit Logging         — Sensitive operations tracked
```

### Security Headers

All non-public responses include:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## ADRs

| ADR | Title | Summary |
|-----|-------|---------|
| [ADR-001](../../../adr/ADR-001-role-mapping.md) | Role Mapping | UI ↔ DB role consolidation |
| [ADR-002](../../../adr/ADR-002-resources-information-hub.md) | Resources Hub | Information hub architecture |
| [ADR-004](../../../adr/ADR-004-edge-function-cron-pattern.md) | Edge Function Cron | Scheduled task pattern |

---

*Last updated: 2026-07-20*
