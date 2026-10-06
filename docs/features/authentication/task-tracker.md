# Authentication Task Tracker

## Current Status

Authenticated visits to `/login` redirect on the server before the login form renders. Middleware now forwards its verified, sanitized user snapshot to signed-in layouts, eliminating their second Auth-server verification while retaining a safe direct-verification fallback. Four dashboard APIs with tested handler-level authentication bypass middleware verification through an exact-path allowlist. Client fallback states retain the login-card and dashboard-shell skeletons. The local Supabase Auth service is available at its configured port.

## Tasks

### Done

- [x] Prevent login-page authentication flicker - 2026-10-01; changed `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/login/LoginForm.tsx`, `tests/app/login-page.test.tsx`, and `tests/app/page.test.ts`; validated with 43 focused tests and the web TypeScript check.
- [x] Replace the login authentication text fallback with an accessible login-card skeleton - 2026-10-02; changed `apps/web/src/app/(auth)/login/LoginForm.tsx` and `tests/app/login-form.test.tsx`; validated with focused component tests, targeted Biome checks, and the web TypeScript check.
- [x] Add a shared signed-in dashboard-shell skeleton for successful authentication redirects - 2026-10-02; changed `apps/web/src/components/layout/AppShell.tsx`, added `apps/web/src/components/layout/AppShellSkeleton.tsx`, and added `tests/components/AppShellSkeleton.test.tsx`; validated with 46 focused authentication/layout tests, targeted Biome checks, `git diff --check`, and the web TypeScript check.
- [x] Audit authentication and post-login dashboard latency - 2026-10-02; traced `apps/web/middleware.ts`, `apps/web/src/contexts/AuthContext.tsx`, login routing, app layout, dashboard queries, and current Supabase SSR guidance; identified repeated Auth verification, sequential profile hydration, duplicate post-login navigation work, and middleware/API double validation as the primary optimization targets.
- [x] Document the authentication optimization record - 2026-10-02; added `docs/features/authentication/optimization.md` with audited, planned, deferred, and implemented changes; validated against the traced current implementation and official Supabase and Next.js guidance.
- [x] Add visual explanations to the authentication optimization record - 2026-10-02; updated `docs/features/authentication/optimization.md` with preview-friendly Mermaid diagrams for user experience, latency hotspots, and the rollout direction; validated by Markdown review.
- [x] Add a code and validation map to the authentication optimization record - 2026-10-02; updated `docs/features/authentication/optimization.md` with linked source and test files for each optimization concern; validated by path review.
- [x] Reuse server-resolved initial auth state in signed-in routes - 2026-10-02; changed `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/app/(auth)/layout.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/onboarding/awaiting-approval/layout.tsx`, and `apps/web/src/contexts/AuthContext.tsx`; validated with AuthProvider regression tests, 50 focused authentication tests, targeted Biome checks, `git diff --check`, and the web TypeScript check.
- [x] Parallelize employee and associate bootstrap reads - 2026-10-02; added `apps/web/src/lib/auth/user-bootstrap.ts` and `tests/lib/auth/user-bootstrap.test.ts`; validated that JWT-identified onboarding roles start user-status and onboarding-profile reads concurrently while administrator bootstrap skips the onboarding read; covered by the 50 focused authentication tests.
- [x] Streamline successful password-login navigation - 2026-10-02; changed `apps/web/src/contexts/AuthContext.tsx` and added `tests/contexts/AuthContext.test.tsx`; removed awaited global query invalidation, the pre-navigation route refresh, history-pushing navigation, and duplicate `SIGNED_IN` profile resolution; validated that login clears prior-session data synchronously, performs one destination replacement, and resolves a `SIGNED_IN` callback only once.
- [x] Remove middleware/layout Auth verification duplication - 2026-10-02; added `apps/web/src/lib/auth/request-snapshot.ts`, changed `apps/web/middleware.ts` and `apps/web/src/app/(app)/layout.tsx`, and added snapshot/layout/middleware regression tests; middleware overwrites client-supplied snapshot headers after `getUser()`, forwards only allowlisted identity fields upstream, and preserves refreshed cookies, while the layout falls back to direct `getUser()` when no valid snapshot exists.
- [x] Pilot middleware bypass for independently protected dashboard APIs - 2026-10-02; changed `apps/web/middleware.ts` and added `tests/api/dashboard-auth-boundary.test.ts` plus `tests/middleware-auth.test.ts`; four exact dashboard API paths now authenticate only in their handlers, and all four return 401 without a valid user; unlisted and future API paths continue through middleware authentication.
- [x] Add authentication timing instrumentation - 2026-10-02; added `apps/web/src/lib/auth/timing.ts` and `tests/lib/auth/timing.test.ts`, instrumented middleware, signed-in bootstrap, and the four dashboard API auth boundaries; middleware responses expose `Server-Timing`, and setting `AUTH_TIMING_ENABLED=true` emits structured PII-free timing events for production p50/p95 analysis.
- [x] Restore the local Supabase Auth service - 2026-10-06; started Docker Desktop and verified the configured `http://127.0.0.1:55321` endpoint; validated with `pnpm supabase:status`, a listening-port check, and `GET /auth/v1/health` returning HTTP 200.

### In Progress

- None.

### Deferred

- [ ] Refactor the existing `AppShellInner` complexity warning - outside the authentication-loading scope; Biome reports cognitive complexity 18 against a limit of 15; resume during a dedicated AppShell maintainability pass.
- [ ] Refactor existing dashboard handler complexity - outside the authentication-boundary change; targeted Biome reports cognitive complexity 39 in analytics, 18 in pending approvals, and 16 in super-admin stats against a limit of 15; resume during a dedicated dashboard API maintainability pass.
- [ ] Replace eligible middleware `getUser()` calls with verified `getClaims()` checks - requires confirming asymmetric JWT signing, upgrading and validating the beta `@supabase/ssr` integration, and defining the acceptable revoked-session window; resume after production auth timing instrumentation is available.
- [ ] Expand middleware bypass beyond the four dashboard APIs - the exact-path pilot is complete, but the remaining API inventory includes public, secret-authenticated, middleware-dependent, and handler-authenticated routes; resume module by module only after each route has handler-level 401/403 coverage.
- [ ] Collect production authentication timing baseline - instrumentation is implemented but no production p50/p95 sample has been collected; resume after deploying with `AUTH_TIMING_ENABLED=true` and gathering middleware, layout-bootstrap, and dashboard-handler events.

### Skipped

- None.

### Blocked

- None.

## Session History

- 2026-10-01: Moved the authenticated `/login` decision to the server, preserved safe return paths and account-state redirects, retained a local mock-auth fallback, and added focused route tests. No remaining redirect issue was identified after tests and typechecking passed.
- 2026-10-02: Replaced primitive authentication loading text with shimmer skeletons for both the login card and the shared signed-in application shell. Chose one role-neutral shell skeleton because the role is not available until authentication resolves. All 46 focused tests and current-state typechecking passed; the pre-existing `AppShellInner` complexity warning remains deferred.
- 2026-10-02: Audited end-to-end authentication latency. Recommended measuring phase timings first, then removing duplicate post-login navigation work, consolidating profile hydration, passing server-resolved auth state into the signed-in client tree, evaluating `getClaims()` for optimistic route protection, and eliminating middleware/API double verification only after a complete handler audit. No runtime code changed during this investigation.
- 2026-10-02: Created `optimization.md` as the durable history of audited, planned, deferred, and implemented authentication optimizations. No runtime code changed; implementation remains deferred pending baseline timing data and explicit rollout approval.
- 2026-10-06: Investigated `AuthRetryableFetchError` / `ECONNREFUSED` for the local Auth endpoint. The active portal configuration uses the documented local API port `55321`; Docker Desktop's unavailable Linux engine initially prevented Supabase from running. Started Docker Desktop and validated the recovered stack with `pnpm supabase:status`, a port-listener check, and a 200 response from `/auth/v1/health`. No application code was implicated.
- 2026-10-02: Added Mermaid diagrams and a standing visual-documentation rule to `optimization.md` so future optimization entries remain understandable in Markdown preview mode.
- 2026-10-02: Added linked code and validation maps to `optimization.md` so optimization audits can be traced directly to their implementation and tests.
- 2026-10-02: Implemented and validated the first low-risk latency batch. Signed-in layouts now preload AuthProvider from a server-resolved snapshot, employee/associate account and onboarding reads run concurrently when the JWT role permits it, and fresh login clears stale query data then performs one `router.replace` without duplicate `SIGNED_IN` hydration. Validation: 50 focused tests, web TypeScript check, targeted Biome checks, and `git diff --check`; Graphify was refreshed for the new shared module and route boundary. Middleware/API verification overlap and `getClaims()` remain deferred until production timing and security audits are available.
- 2026-10-02: Continued the verification-overlap rollout. Middleware now passes a sanitized snapshot from its verified user to the signed-in layout, removing one Auth-server request per protected page while retaining direct fallback verification. Four exact dashboard API paths now skip middleware because their handlers have explicit 401/role enforcement; future paths do not inherit the bypass. Added PII-free structured timings and a middleware `Server-Timing` metric. Validation: 72 focused tests, web TypeScript check, targeted Biome checks, and spoofed-header/cookie-preservation coverage. Wider API bypass and production p50/p95 collection remain deferred.
- 2026-10-02: Re-ran the focused authentication suites for login loading, application-shell loading, AuthContext navigation, and bootstrap concurrency: 7 tests passed. The root build compiled and type-checked `apps/web`, then reached page-data collection, but was stopped because the Next.js worker grew beyond 3.6 GB while the host had only 0.43 GB free. No source diagnostic was emitted; rerun the full build with sufficient free memory before release.
- 2026-10-02: Revalidated the middleware snapshot, dashboard API boundary, timing instrumentation, and signed-in layout changes: 21 focused tests and `pnpm --filter @hr-portal/web typecheck` passed. The full build completed every non-web workspace, but the `apps/web` production build was stopped during resource-constrained Next.js compilation without emitting a source diagnostic; rerun `pnpm --filter @hr-portal/web build` on a less-contended host before release.
