# Authentication Optimization Record

This is the durable record of authentication-related optimizations. Add an entry whenever work is audited, planned, implemented, changed, or validated so future work can distinguish measured improvements from ideas that are still pending.

## Visual Documentation Rule

Use a compact Mermaid diagram when an optimization crosses three or more stages, spans multiple application layers, or has a security/performance tradeoff. Keep simple single-file changes as concise text. Update the relevant diagram whenever its described flow changes.

## Status Legend

- **Implemented**: shipped in the working tree and validated.
- **Planned**: reviewed and approved for a future implementation.
- **Audited**: investigated with evidence, but not yet approved or implemented.
- **Deferred**: intentionally postponed, with a condition for resuming work.

## Visual Guide

### User experience during authentication

```mermaid
flowchart LR
    A[Visit site] --> B{Session known?}
    B -- No or unresolved --> C[Login-card skeleton]
    C --> D[Login form or sign-in]
    B -- Yes --> E[Server auth snapshot]
    D --> E
    E --> F[Preloaded client provider]
    F --> G[Role dashboard]
    F -. Client fallback only .-> H[Dashboard-shell skeleton]
```

Normal signed-in requests now receive a preloaded user and can render the real shell immediately. The two skeletons remain useful for local mock auth and client recovery paths.

### Current latency hotspots

```mermaid
sequenceDiagram
    participant Browser
    participant Server
    participant Auth as Supabase Auth
    participant DB as Supabase Database

    Browser->>Server: Open protected route
    Server->>Auth: Middleware getUser
    Server-->>Server: Forward verified snapshot to app layout
    par Account lookup
        Server->>DB: Role and status lookup
    and Onboarding lookup for employee/associate JWT
        Server->>DB: Onboarding profile lookup
    end
    Server-->>Browser: Signed-in route + initial user
    Browser->>Server: Dashboard API requests
    alt Exact allowlisted dashboard API
        Server->>Auth: Route-handler getUser only
    else Other protected API
        Server->>Auth: Middleware and route-handler verification
    end
```

Serial browser profile hydration and middleware/layout double verification have been removed from normal signed-in routes. Four dashboard APIs also avoid middleware/handler duplication. The remaining API inventory is still mixed and must be expanded only with handler-level security coverage; region distance may amplify every remaining remote call.

### Planned optimization direction

```mermaid
flowchart TB
    A[Done: single login navigation] --> B[Done: parallel profile bootstrap]
    B --> C[Done: server snapshot to client shell]
    C --> D[Done: middleware snapshot reuse]
    D --> E[Done: dashboard API bypass pilot]
    E --> F[Next: collect production p50 and p95]
    F --> G[Expand audited API bypass]
    G --> H[Evaluate getClaims and region alignment]
```

Each stage requires its stated validation before the next optimization is treated as complete.

## Relevant Code Map

Use this map to jump from an optimization entry to the implementation area it affects.

| Concern | Primary files | Why these files matter |
| --- | --- | --- |
| Server-side login redirect | [`apps/web/src/app/(auth)/login/page.tsx`](../../../apps/web/src/app/(auth)/login/page.tsx) | Verifies an existing session, resolves role/status, and redirects authenticated visitors before the login form renders. |
| Client login behavior and login skeleton | [`apps/web/src/app/(auth)/login/LoginForm.tsx`](../../../apps/web/src/app/(auth)/login/LoginForm.tsx) | Handles password submission, client fallback redirects, and the login-card skeleton. |
| Client auth provider and login transition | [`apps/web/src/contexts/AuthContext.tsx`](../../../apps/web/src/contexts/AuthContext.tsx) | Accepts the server-preloaded user, retains browser fallback recovery, and performs the streamlined post-login cache/navigation transition. |
| Signed-in server bootstrap | [`apps/web/src/app/(app)/layout.tsx`](../../../apps/web/src/app/(app)/layout.tsx) | Authenticates the request, resolves the minimal user snapshot, and initializes AuthProvider before the signed-in shell renders. |
| Shared user bootstrap resolver | [`apps/web/src/lib/auth/user-bootstrap.ts`](../../../apps/web/src/lib/auth/user-bootstrap.ts) | Keeps server and browser user resolution consistent and starts eligible account/onboarding reads concurrently. |
| Auth provider boundaries | [`apps/web/src/app/layout.tsx`](../../../apps/web/src/app/layout.tsx), [`apps/web/src/app/(auth)/layout.tsx`](../../../apps/web/src/app/(auth)/layout.tsx), [`apps/web/src/app/onboarding/awaiting-approval/layout.tsx`](../../../apps/web/src/app/onboarding/awaiting-approval/layout.tsx) | Limits client auth bootstrap to route groups that need it and preserves coverage for the standalone approval route. |
| Request middleware verification | [`apps/web/middleware.ts`](../../../apps/web/middleware.ts) | Refreshes/verifies protected page sessions, forwards the verified snapshot upstream, and holds the exact dashboard API bypass allowlist. |
| Verified request snapshot | [`apps/web/src/lib/auth/request-snapshot.ts`](../../../apps/web/src/lib/auth/request-snapshot.ts) | Serializes only the identity fields needed by the layout and validates the forwarded snapshot before reuse. |
| Auth timing instrumentation | [`apps/web/src/lib/auth/timing.ts`](../../../apps/web/src/lib/auth/timing.ts) | Emits optional structured PII-free timing events and formats middleware `Server-Timing` metrics. |
| Server Supabase client | [`apps/web/src/lib/supabase/server.ts`](../../../apps/web/src/lib/supabase/server.ts) | Builds the cookie-backed server client used by pages and route handlers. |
| Browser Supabase client | [`apps/web/src/lib/supabase/client.ts`](../../../apps/web/src/lib/supabase/client.ts) | Builds the browser client used by AuthContext session hydration. |
| Signed-in shell and dashboard loading state | [`apps/web/src/components/layout/AppShell.tsx`](../../../apps/web/src/components/layout/AppShell.tsx) | Waits for the authenticated user before rendering signed-in navigation and dashboard content. |
| Dashboard-shell skeleton | [`apps/web/src/components/layout/AppShellSkeleton.tsx`](../../../apps/web/src/components/layout/AppShellSkeleton.tsx) | Shows the responsive signed-in placeholder while authentication/profile state is unresolved. |
| Query client behavior | [`apps/web/src/lib/query-client.ts`](../../../apps/web/src/lib/query-client.ts) | Defines React Query defaults relevant to the broad post-login invalidation decision. |
| Employee dashboard requests | [`apps/web/src/app/(app)/(employee)/dashboard/page.tsx`](../../../apps/web/src/app/(app)/(employee)/dashboard/page.tsx) | Starts several dashboard data queries after the signed-in shell is ready. |
| Admin dashboard requests | [`apps/web/src/app/(app)/(admin)/admin/dashboard/page.tsx`](../../../apps/web/src/app/(app)/(admin)/admin/dashboard/page.tsx) | Starts admin dashboard data queries whose API authentication can overlap with middleware verification. |
| Super-admin dashboard requests | [`apps/web/src/app/(app)/(admin)/super-admin/dashboard/page.tsx`](../../../apps/web/src/app/(app)/(admin)/super-admin/dashboard/page.tsx) | Starts super-admin dashboard data queries with the same middleware/API verification consideration. |

### Tests and Validation Files

| Area | Files |
| --- | --- |
| Server redirect behavior | [`tests/app/login-page.test.tsx`](../../../tests/app/login-page.test.tsx), [`tests/app/page.test.ts`](../../../tests/app/page.test.ts) |
| Login skeleton behavior | [`tests/app/login-form.test.tsx`](../../../tests/app/login-form.test.tsx) |
| Dashboard-shell skeleton behavior | [`tests/components/AppShellSkeleton.test.tsx`](../../../tests/components/AppShellSkeleton.test.tsx) |
| Redirect safety rules | [`tests/lib/auth/redirect-config.test.ts`](../../../tests/lib/auth/redirect-config.test.ts) |
| Server-preloaded provider and login navigation | [`tests/contexts/AuthContext.test.tsx`](../../../tests/contexts/AuthContext.test.tsx) |
| Parallel user bootstrap | [`tests/lib/auth/user-bootstrap.test.ts`](../../../tests/lib/auth/user-bootstrap.test.ts) |
| Middleware snapshot and API bypass policy | [`tests/middleware-auth.test.ts`](../../../tests/middleware-auth.test.ts), [`tests/lib/auth/request-snapshot.test.ts`](../../../tests/lib/auth/request-snapshot.test.ts) |
| Signed-in layout snapshot reuse | [`tests/app/app-layout-auth.test.tsx`](../../../tests/app/app-layout-auth.test.tsx) |
| Dashboard handler security boundary | [`tests/api/dashboard-auth-boundary.test.ts`](../../../tests/api/dashboard-auth-boundary.test.ts) |
| Auth timing output | [`tests/lib/auth/timing.test.ts`](../../../tests/lib/auth/timing.test.ts) |

## Implemented Optimizations

### Server-side redirect for authenticated `/login` visits

- **Status:** Implemented — 2026-10-01
- **Problem:** An existing session first saw the login form, then the browser restored authentication and redirected to the dashboard.
- **Solution:** Resolve the Supabase user and account routing state on the server before rendering the login form. Retain a guarded browser fallback for local mock auth and transient server-auth failures.
- **Changed paths:**
  - `apps/web/src/app/(auth)/login/page.tsx`
  - `apps/web/src/app/(auth)/login/LoginForm.tsx`
  - `tests/app/login-page.test.tsx`
  - `tests/app/page.test.ts`
- **Validation:** 43 focused tests passed; web TypeScript check passed.

### Login-card skeleton during unresolved client authentication

- **Status:** Implemented — 2026-10-02
- **Problem:** Local mock auth and transient server-auth recovery used a primitive visible `Loading...` message.
- **Solution:** Replace it with an accessible shimmer skeleton that preserves the login card's dimensions and structure.
- **Changed paths:**
  - `apps/web/src/app/(auth)/login/LoginForm.tsx`
  - `tests/app/login-form.test.tsx`
- **Validation:** Focused component tests, targeted Biome checks, and web TypeScript check passed.

### Dashboard-shell skeleton after successful authentication

- **Status:** Implemented — 2026-10-02
- **Problem:** After a successful redirect, the signed-in area still showed a primitive `Loading...` state while browser authentication and user profile data resolved.
- **Solution:** Replace the AppShell fallback with a responsive, role-neutral skeleton for the sidebar, header, summary cards, chart area, and activity panel.
- **Changed paths:**
  - `apps/web/src/components/layout/AppShell.tsx`
  - `apps/web/src/components/layout/AppShellSkeleton.tsx`
  - `tests/components/AppShellSkeleton.test.tsx`
- **Validation:** 46 focused authentication/layout tests passed; targeted Biome checks, `git diff --check`, and web TypeScript check passed.

### Server-preloaded signed-in AuthProvider

- **Status:** Implemented — 2026-10-02
- **Problem:** Protected requests were authenticated on the server, but the global client AuthProvider still began with no user and repeated session, account, and onboarding hydration before showing the real shell.
- **Solution:** Move AuthProvider to the route boundaries. The signed-in `(app)` layout now authenticates and resolves a minimal user snapshot on the server, then passes it as `initialUser`; auth routes and the standalone awaiting-approval route retain client bootstrap where it is needed. Local mock auth still restores from `localStorage`.
- **Changed paths:**
  - `apps/web/src/app/(app)/layout.tsx`
  - `apps/web/src/app/(auth)/layout.tsx`
  - `apps/web/src/app/layout.tsx`
  - `apps/web/src/app/onboarding/awaiting-approval/layout.tsx`
  - `apps/web/src/contexts/AuthContext.tsx`
  - `tests/contexts/AuthContext.test.tsx`
- **Validation:** A regression test proves a server-preloaded user is ready immediately without calling browser `getSession()` or `getUser()`; focused authentication tests and web TypeScript check passed.

### Concurrent account and onboarding bootstrap

- **Status:** Implemented — 2026-10-02
- **Problem:** Employee and associate profile hydration waited for the account/status query before starting the onboarding-profile query.
- **Solution:** Extract one shared bootstrap resolver. When the verified JWT contains an employee or associate `db_role`, it starts both reads together; if metadata is absent or stale, it safely falls back to the database-resolved role. Administrator roles avoid the unnecessary onboarding query.
- **Changed paths:**
  - `apps/web/src/lib/auth/user-bootstrap.ts`
  - `apps/web/src/contexts/AuthContext.tsx`
  - `apps/web/src/app/(app)/layout.tsx`
  - `tests/lib/auth/user-bootstrap.test.ts`
- **Validation:** Unit tests prove both onboarding-role reads are started before either resolves and that administrators perform only the account read.

### Single post-login cache and navigation transition

- **Status:** Implemented — 2026-10-02
- **Problem:** Successful password login awaited global React Query invalidation, refreshed the login route, then pushed the dashboard route. The Supabase `SIGNED_IN` callback could also race the explicit profile resolution.
- **Solution:** Clear previous-session query data synchronously, suppress the duplicate `SIGNED_IN` bootstrap while explicit login resolution is active, and perform one `router.replace(destination)`. Destination queries populate the clean cache after navigation.
- **Changed paths:**
  - `apps/web/src/contexts/AuthContext.tsx`
  - `tests/contexts/AuthContext.test.tsx`
- **Validation:** A regression test verifies `queryClient.clear()` is used, global invalidation is not called, and the correct dashboard route is replaced once.

### Reuse middleware verification in the signed-in layout

- **Status:** Implemented — 2026-10-02
- **Problem:** Middleware called `getUser()` to validate and refresh the request, then the signed-in layout immediately called `getUser()` again before resolving the user bootstrap.
- **Solution:** After middleware verifies the user, it forwards a compact URL-encoded snapshot through an upstream-only request header. Incoming values for that internal header are deleted and replaced, only required string metadata fields are forwarded, and the layout validates the snapshot structure before reuse. If middleware did not provide a valid snapshot, the layout retains its direct `getUser()` fallback.
- **Changed paths:**
  - `apps/web/middleware.ts`
  - `apps/web/src/app/(app)/layout.tsx`
  - `apps/web/src/lib/auth/request-snapshot.ts`
  - `tests/middleware-auth.test.ts`
  - `tests/app/app-layout-auth.test.tsx`
  - `tests/lib/auth/request-snapshot.test.ts`
- **Validation:** Tests prove the layout avoids its second Auth request, invalid/missing snapshots fall back safely, client-supplied snapshot headers are overwritten, and refreshed cookies are preserved.

### Exact dashboard API middleware bypass pilot

- **Status:** Implemented — 2026-10-02
- **Problem:** Dashboard API calls were verified once in middleware and again in their route handlers, adding one Auth-server round trip per request.
- **Solution:** Bypass middleware authentication for exactly four audited paths: analytics, pending approvals, admin stats, and super-admin stats. Each handler remains responsible for authentication and role/access checks close to its data access. The allowlist uses exact paths, so newly added dashboard APIs remain middleware-protected by default.
- **Changed paths:**
  - `apps/web/middleware.ts`
  - `apps/web/src/app/api/dashboard/analytics/route.ts`
  - `apps/web/src/app/api/dashboard/pending/route.ts`
  - `apps/web/src/app/api/dashboard/stats/route.ts`
  - `apps/web/src/app/api/dashboard/super-admin-stats/route.ts`
  - `tests/api/dashboard-auth-boundary.test.ts`
  - `tests/middleware-auth.test.ts`
- **Validation:** All four handlers return 401 without an authenticated user; unlisted API paths still invoke middleware authentication; the expanded focused suite passed 72 tests.

### Production-capable Auth phase timing

- **Status:** Implemented — 2026-10-02
- **Problem:** Optimization decisions lacked phase-level evidence for middleware verification, layout fallback/bootstrap, and dashboard handler authentication.
- **Solution:** Add structured, PII-free events gated by `AUTH_TIMING_ENABLED=true`. Middleware also returns an `auth_middleware` `Server-Timing` metric for browser/network inspection. Instrument the signed-in bootstrap and the four dashboard handler boundaries.
- **Changed paths:**
  - `apps/web/src/lib/auth/timing.ts`
  - `apps/web/middleware.ts`
  - `apps/web/src/app/(app)/layout.tsx`
  - `apps/web/src/app/api/dashboard/analytics/route.ts`
  - `apps/web/src/app/api/dashboard/pending/route.ts`
  - `apps/web/src/app/api/dashboard/stats/route.ts`
  - `apps/web/src/app/api/dashboard/super-admin-stats/route.ts`
  - `tests/lib/auth/timing.test.ts`
- **Validation:** Tests verify structured output is gated and contains no user identifier, and verify the middleware response contains the expected `Server-Timing` metric.
- **Next measurement condition:** Deploy with `AUTH_TIMING_ENABLED=true`, collect a representative sample, and record p50/p95 before widening the API bypass or changing JWT verification semantics.

## Audited Optimization Opportunities

### Measure the current baseline first

- **Status:** Audited — 2026-10-02
- **Finding:** There is no phase-by-phase production timing for sign-in, middleware verification, profile bootstrap, navigation, or first useful dashboard content.
- **Planned solution:** Add client performance marks and server timing, then record p50 and p95 for returning users and fresh password logins.
- **Success measure:** Identify whether the principal delay is Auth, database bootstrap, navigation, dashboard APIs, or application/Supabase region distance.

### Reduce repeated Auth verification in middleware and dashboard APIs

- **Status:** Audited — pilot implemented; wider rollout deferred
- **Evidence:** The four audited dashboard APIs now authenticate only in their handlers. The repository contains 280 API route files with a mix of direct `getUser()`, shared authenticated contexts, public callbacks, cron/webhook secrets, and some routes that still depend on middleware.
- **Planned solution:** Expand exact-path bypasses module by module after each route has explicit unauthenticated and unauthorized regression coverage. Do not replace the exact allowlist with a broad `/api/*` exclusion.
- **Expected effect:** Remove one Auth-server request from each safely migrated API call.
- **Safety checks:** Handler-level 401/403 tests, role/access tests, cookie-refresh behavior, and exact-path middleware tests for every rollout group.

### Evaluate `getClaims()` for eligible middleware checks

- **Status:** Deferred
- **Reason:** The project uses `@supabase/ssr` 0.7.0. Adoption requires a package upgrade, confirmation of asymmetric JWT signing, and a documented acceptable window for detecting server-side session revocation.
- **Resume condition:** Production timing baseline and a tested SSR package upgrade plan are available.
- **Notes:** Supabase recommends `getClaims()` for verified page/data protection where local JWT verification is available; `getUser()` remains appropriate when the latest Auth-server user record or immediate revoked-session detection is required.

### Co-locate application compute and Supabase

- **Status:** Audited
- **Finding:** Network distance can dominate any remaining Auth or profile request time.
- **Planned solution:** Compare deployment and Supabase regions against the timing baseline, then move or configure compute near the database/Auth region if needed.
- **Success measure:** Lower server auth and database timing without changing application behavior.

## Security Rules for Every Optimization

- Do not use browser `getSession()` data alone for secure authorization decisions.
- Keep RLS and route-handler/data-access authorization as the security boundary.
- Do not substitute `getClaims()` for `getUser()` until the session-revocation tradeoff is explicitly accepted.
- Preserve correct routing for disabled, pending-onboarding, and awaiting-approval accounts.
- Validate expired and revoked sessions, all roles, and return-to routing for every auth-flow change.

## Review Sources

- [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase advanced SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Next.js upstream request-header guidance](https://nextjs.org/docs/app/guides/backend-for-frontend#security)

## Change Log

- 2026-10-01: Recorded server-side authenticated-login redirect implementation.
- 2026-10-02: Recorded login-card and dashboard-shell loading skeleton implementations.
- 2026-10-02: Recorded authentication latency audit and future optimization candidates.
- 2026-10-02: Added preview-friendly Mermaid diagrams and a visual-documentation rule for future optimization entries.
- 2026-10-02: Added a file-by-file code map and validation-file map for optimization review and implementation navigation.
- 2026-10-02: Implemented server-preloaded signed-in auth state, concurrent employee/associate bootstrap reads, and a single post-login cache/navigation transition. Added regression coverage for the shared resolver and AuthProvider behavior; retained server/RLS authorization boundaries and deferred middleware/API verification changes.
- 2026-10-02: Removed middleware/layout double verification with a sanitized upstream-only user snapshot and safe layout fallback. Added an exact-path middleware bypass for four independently authenticated dashboard APIs, plus 401 boundary tests, spoofed-header coverage, cookie-preservation coverage, structured timing events, and a middleware `Server-Timing` metric. Wider API rollout awaits module-level security tests and production p50/p95 data.
