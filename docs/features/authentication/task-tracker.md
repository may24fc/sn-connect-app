# Authentication Task Tracker

## Current Status

Authenticated visits to `/login` redirect on the server before the login form renders. Signed-in routes now resolve the user snapshot at their server layout boundary and initialize the client provider with it, avoiding a second browser profile bootstrap. Client fallback states retain the login-card and dashboard-shell skeletons.

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

### In Progress

- None.

### Deferred

- [ ] Refactor the existing `AppShellInner` complexity warning - outside the authentication-loading scope; Biome reports cognitive complexity 18 against a limit of 15; resume during a dedicated AppShell maintainability pass.
- [ ] Replace eligible middleware `getUser()` calls with verified `getClaims()` checks - requires confirming asymmetric JWT signing, upgrading and validating the beta `@supabase/ssr` integration, and defining the acceptable revoked-session window; resume after production auth timing instrumentation is available.
- [ ] Remove middleware/API double authentication work - protected API handlers generally perform their own `getUser()` checks, but the complete route inventory must be audited before excluding API paths from middleware; resume after proving every protected handler enforces authentication close to its data source.
- [ ] Add production authentication phase timing - no p50/p95 breakdown exists for middleware verification, server bootstrap, navigation, or first useful dashboard content; resume before choosing the next latency target.

### Skipped

- None.

### Blocked

- None.

## Session History

- 2026-10-01: Moved the authenticated `/login` decision to the server, preserved safe return paths and account-state redirects, retained a local mock-auth fallback, and added focused route tests. No remaining redirect issue was identified after tests and typechecking passed.
- 2026-10-02: Replaced primitive authentication loading text with shimmer skeletons for both the login card and the shared signed-in application shell. Chose one role-neutral shell skeleton because the role is not available until authentication resolves. All 46 focused tests and current-state typechecking passed; the pre-existing `AppShellInner` complexity warning remains deferred.
- 2026-10-02: Audited end-to-end authentication latency. Recommended measuring phase timings first, then removing duplicate post-login navigation work, consolidating profile hydration, passing server-resolved auth state into the signed-in client tree, evaluating `getClaims()` for optimistic route protection, and eliminating middleware/API double verification only after a complete handler audit. No runtime code changed during this investigation.
- 2026-10-02: Created `optimization.md` as the durable history of audited, planned, deferred, and implemented authentication optimizations. No runtime code changed; implementation remains deferred pending baseline timing data and explicit rollout approval.
- 2026-10-02: Added Mermaid diagrams and a standing visual-documentation rule to `optimization.md` so future optimization entries remain understandable in Markdown preview mode.
- 2026-10-02: Added linked code and validation maps to `optimization.md` so optimization audits can be traced directly to their implementation and tests.
- 2026-10-02: Implemented and validated the first low-risk latency batch. Signed-in layouts now preload AuthProvider from a server-resolved snapshot, employee/associate account and onboarding reads run concurrently when the JWT role permits it, and fresh login clears stale query data then performs one `router.replace` without duplicate `SIGNED_IN` hydration. Validation: 50 focused tests, web TypeScript check, targeted Biome checks, and `git diff --check`; Graphify was refreshed for the new shared module and route boundary. Middleware/API verification overlap and `getClaims()` remain deferred until production timing and security audits are available.
- 2026-10-02: Re-ran the focused authentication suites for login loading, application-shell loading, AuthContext navigation, and bootstrap concurrency: 7 tests passed. The root build compiled and type-checked `apps/web`, then reached page-data collection, but was stopped because the Next.js worker grew beyond 3.6 GB while the host had only 0.43 GB free. No source diagnostic was emitted; rerun the full build with sufficient free memory before release.
