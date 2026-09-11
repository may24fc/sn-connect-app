# Virtual Christmas Tree Implementation Checklist

**Delivery window:** September 8-23, 2026  
**Target:** Production-ready launch before the October 1 first-wish unlock  
**Status:** Planned

## Purpose

Build an authenticated Control Hub experience where each team member places one personalized Christmas ball on a shared tree, records three personal wishes in October plus one wish in each November and December release window, and lets teammates inspect submitted, currently unlocked wishes at any time.

**Industry Standard - Mental model:** the browser renders the tree and collects intent; the server is the authority for identity, one-ornament ownership, safe placement, and whether a wish slot is unlocked. The database constraints and RLS policies remain the final enforcement layer.

Before deciding any **YOUR CALL**, predict the trade-off first. For each **HEADS-UP**, ask how that issue could have been detected earlier. Record accepted decisions in `docs/decisions/` with the decision, options, reasoning, and what would change the decision.

## Ground Truth (September 8)

- **VERIFIED:** `pnpm typecheck` passed for all eight workspace projects on September 8, 2026.
- **VERIFIED:** `apps/web` contains authenticated self-service feature patterns, API routes, TanStack Query hooks, and Supabase Realtime subscriptions that this feature can reuse.
- **VERIFIED:** No dedicated Christmas-tree implementation exists. The authenticated Wellness Bingo feature supplies the closest API, hook, migration, and Realtime patterns.
- **UNVERIFIED:** Supabase local migration and RLS integration coverage was not run for this planning pass.
- **BLOCKED:** On September 11, both `supabase db reset --local --no-seed` and `supabase db push --local` stopped at the pre-existing `20260817133900_import_marketing_ads_data.sql` migration because local `auth.users` is empty. The Christmas Tree migration was not reached. Fix by bootstrapping local auth before the import or making that import migration safely skip an empty local auth dataset.

## Scope and Traceability

| Requirement | Delivery coverage |
| --- | --- |
| US-01 / FR-01 / FR-02 / FR-03 | Identity-backed ornament selection, one placement per user, responsive tree rendering, collision-safe coordinates, and visible ownership. |
| US-02 / FR-04 | Three server-time-gated categories: October Top 3 personal wishes, November wish for others, and December wish for SN. Earlier unlocked categories remain visible and editable through their monthly deadline. |
| US-03 | Ornament-inspection modal with submitted wishes and locked-category teasers; viewing is available to authenticated teammates as soon as a wish is submitted. |
| FR-05 | Read-only fullscreen presentation mode for the Christmas call. |
| Optional realtime | Realtime subscriptions refresh the shared tree when ornaments or wishes change. |

## Timeline

| Date | Milestone | Exit evidence |
| --- | --- | --- |
| Sep 8 | Scope, decisions, and technical spike | Complete: authenticated portal identity, team viewing, eight Christmas-ball designs, Philippines timezone, monthly deadlines, tree milestones, and HR approval owner confirmed. |
| Sep 9-10 | Schema and access controls | Migration applies locally; constraints and RLS integration tests pass. |
| Sep 11-12 | Server contract | Authenticated ornament and wish APIs reject invalid, duplicate, and locked operations. |
| Sep 15-17 | Core team experience | A member can select, place, revisit, and inspect ornaments on desktop and mobile. |
| Sep 18-19 | Presentation and realtime | Read-only fullscreen view and live updates work without exposing private drafts. |
| Sep 22 | Quality and acceptance | Unit, API, E2E, accessibility, and responsive checks pass. |
| Sep 23 | Launch readiness | Production configuration, monitoring, rollback procedure, and stakeholder sign-off are complete. |

## Phase 0 - Decisions and Feature Boundary (Sep 8)

- [x] **0.1** Identify the owner route under `apps/web/src/app/(employee)` and reuse the closest authenticated interactive feature's API, hook, and component patterns. **Effort:** S. **Requirement:** FR-01. **Completed September 11:** Wellness Bingo is the reference feature.
- [x] **0.2** Define the season/event configuration in `Asia/Manila`: October 1 / October 20 23:59:59, November 1 / November 20 23:59:59, December 1 / December 20 23:59:59, with the event remaining viewable through December 31. **Effort:** S. **Requirement:** FR-04. **Decision confirmed September 9.**
- [x] **0.3** Use existing authenticated Control Hub accounts as the sole identity source. Do not ship a client-side name-claim alternative: it cannot reliably enforce one ornament per person. **Effort:** S. **Requirement:** FR-01. **Decision confirmed September 9.**
- [x] **0.4** Let all authenticated teammates inspect submitted wishes immediately; hide the November and December categories until their release month, keep earlier categories visible, and allow admins to moderate entries. **Effort:** S. **Requirement:** US-03. **Decision confirmed September 9.**
- [x] **0.5** Approve eight Christmas-ball asset types: red, gold, silver, green, blue, pearl, burgundy, and champagne. Implementation must use licensed or original assets with alt text, stable keys, and contrast checks. **Effort:** S. **Requirement:** FR-02. **Decision confirmed September 9.**
- [x] **0.6** Define team milestones: garland after every active participant submits October wishes; lights after every active participant submits November wishes; top star after every active participant submits December wishes. **Effort:** S. **Requirement:** FR-03, FR-04. **Decision confirmed September 9.**
- [x] **0.7** Confirm HR is the final approver for the September 23 walkthrough and production release. **Effort:** S. **Requirement:** —. **Decision confirmed September 9.**

## Phase 1 - Data Model and Security (Sep 9-10)

**Implementation status:** Schema, constraints, RLS, server-time trigger, decoration-state function, and 2026 event configuration implemented September 11. Local application and RLS integration verification remain blocked by the pre-existing local migration failure recorded above.

- [x] **1.1** Add a timestamped migration for `christmas_tree_events`, `christmas_ornaments`, and `christmas_wishes`, including standard audit columns and foreign keys to authenticated users. Store three season windows and deadlines; constrain `asset_type` to the eight approved ball designs. **Effort:** M. **Requirement:** US-01, US-02, FR-02, FR-04. **Implemented September 11; local application verification blocked.**
- [x] **1.2** Enforce one ornament per user per event with a unique database constraint. Model October's Top 3 as three ordered personal-wish entries (`category = personal`, `item_number = 1..3`), plus one November and one December category entry; prevent duplicates with a unique constraint. **Effort:** S. **Requirement:** US-01, US-02. **Implemented September 11; local application verification blocked.**
- [x] **1.3** Store positions as normalized percentages (`position_x`, `position_y`) with database bounds and reserve placement generation to the server. **Effort:** M. **Requirement:** FR-03. **Implemented September 11; collision-aware allocation remains Phase 2 work.**
- [x] **1.4** Add RLS policies: authenticated users can read ornaments for the active event, create/update only their own ornament and wishes, and cannot change `user_id`, event, slot, or submission timestamps. Limit event configuration and moderation to approved admin roles. **Effort:** L. **Requirement:** FR-01, FR-04. **Implemented September 11; local RLS verification blocked.**
- [x] **1.5 HEADS-UP** Enforce category release and 20th-of-month deadline rules in a database trigger using database/server time, never the browser clock. The UI lock is presentation only; direct writes are rejected before release or after deadline. **Effort:** M. **Requirement:** US-02, FR-04. **Implemented September 11; local verification blocked.**
- [x] **1.6** Compute event decoration state from all non-deleted users with `active` status: garland for complete October submissions, lights for complete November submissions, and top star for complete December submissions. **Effort:** M. **Requirement:** FR-03, FR-04. **Implemented September 11; local verification blocked.**
- [ ] **1.7** Add Supabase migration/RLS integration tests for constraints, cross-user access denial, malformed positions, each category boundary/deadline, personal Top 3 completeness, and decoration milestones. **Effort:** M. **Requirement:** US-01, US-02, FR-01, FR-03, FR-04. **Skip risk:** Database-layer guarantees remain untested. **HIGH**.

## Phase 2 - Server Contract and Observability (Sep 11-12)

- [ ] **2.1** Create Zod-validated API routes or server actions for event snapshot, ornament placement/update, and wish upsert. Authenticate every request with the existing server Supabase client. **Effort:** L. **Requirement:** US-01, US-02, US-03. **Skip risk:** Invalid payloads or unauthenticated requests reach the data layer. **HIGH**.
- [ ] **2.2** Implement deterministic collision-aware position allocation: select from server-owned tree-safe zones, reject collisions at the ornament's responsive radius, and return a retryable conflict only when capacity is exhausted. **Effort:** M. **Requirement:** FR-03. **Skip risk:** The shared canvas becomes unreadable as participation grows. **HIGH**.
- [ ] **2.3** Return a single typed snapshot containing the active event, decoration state, the requesting member's editable wish categories, public ornament summaries, and server-computed release/deadline/teaser labels. Return three ordered October entries only after October opens; never return future-category content. **Effort:** M. **Requirement:** US-02, US-03. **Skip risk:** UI logic duplicates authorization rules or leaks locked wish text. **HIGH**.
- [ ] **2.4** Add audit-log events for placement, asset changes, wish submission/edit, admin moderation, and event configuration changes. Exclude wish content from logs unless retention and access requirements explicitly permit it. **Effort:** M. **Requirement:** FR-01, FR-04. **Skip risk:** Sensitive actions cannot be investigated without unnecessarily storing private wish text. **MEDIUM**.
- [ ] **2.5** Add structured error telemetry and basic adoption metrics: unique ornaments placed, slot completion by month, placement conflicts, rejected locked-slot requests, and API failures. **Effort:** S. **Requirement:** —. **Skip risk:** No baseline to diagnose launch issues or measure participation. **MEDIUM**.
- [ ] **2.6** Add API tests for authentication, one-ornament contention, ownership, validation, category gates/deadlines in September/October/November/December, October Top 3 completeness, public snapshot redaction, and each team-decoration transition. **Effort:** M. **Requirement:** US-01, US-02, US-03. **Skip risk:** Core contracts regress silently. **HIGH**.

## Phase 3 - Team Experience (Sep 15-17)

- [ ] **3.1** Build the authenticated Christmas Tree page using existing `@hr-portal/ui` primitives, TanStack Query query-key conventions, loading states, error states, and optimistic mutations with rollback. **Effort:** L. **Requirement:** US-01, US-02. **Skip risk:** Slow or failed submissions leave the member without a reliable recovery path. **HIGH**.
- [ ] **3.2** Build the Christmas-ball selector with all eight approved assets, keyboard navigation, visible selection, name sourced from the authenticated profile, and a clear empty/missing-profile state. **Effort:** M. **Requirement:** US-01, FR-02. **Skip risk:** Users cannot reliably create a personalized ornament. **MEDIUM**.
- [ ] **3.3** Render the responsive tree using percentage coordinates and a stable ornament hit target; show owner identity on hover and keyboard focus without obscuring neighboring ornaments. **Effort:** L. **Requirement:** US-01, FR-03. **Skip risk:** Names are inaccessible or ornaments overlap on common screen sizes. **HIGH**.
- [ ] **3.4** Build three server-computed wish categories: three required October personal-wish inputs, one November wish-for-others input, and one December wish-for-SN input. Retain earlier categories, show deadline/submitted state, and hide or disable future categories with exact release labels. **Effort:** M. **Requirement:** US-02. **Skip risk:** The progressive-advent interaction is unclear or incorrect. **HIGH**.
- [ ] **3.5** Render tree progression from server decoration state: add the garland, turn on lights, and illuminate the top star only after the respective team-wide monthly completion threshold. **Effort:** M. **Requirement:** FR-03, FR-04. **Skip risk:** The central collaborative reward is missing or appears at the wrong time. **HIGH**.
- [ ] **3.6** Build the ornament detail modal with owner name, ball design, submitted eligible wishes, and locked-category teasers. Support pointer, keyboard, focus restoration, and screen readers. **Effort:** M. **Requirement:** US-03. **Skip risk:** The call-time reveal is inaccessible or exposes content prematurely. **HIGH**.
- [ ] **3.7** Add component tests for selector validation, locked/unlocked rendering, October Top 3 validation, wish edit states, decoration transitions, collision display, and detail-modal focus behavior. **Effort:** M. **Requirement:** US-01, US-02, US-03. **Skip risk:** UI regressions reach the event. **MEDIUM**.

## Phase 4 - Presentation and Realtime (Sep 18-19)

- [ ] **4.1** Add a read-only fullscreen presentation route or mode with minimal chrome, dense readable ornament labels, responsive scaling, exit controls, and no mutation affordances. **Effort:** M. **Requirement:** FR-05. **Skip risk:** The Christmas-call host must use an unsuitable participant interface. **MEDIUM**.
- [ ] **4.2** Subscribe to allowed ornament and wish changes with the established Supabase Realtime hook pattern; invalidate/refetch the event snapshot and clean up channels on unmount. **Effort:** M. **Requirement:** Optional realtime. **Skip risk:** Shared-screen updates require refreshes and feel stale. **MEDIUM**.
- [ ] **4.3 HEADS-UP** Confirm Realtime replication and RLS behavior in staging before enabling it in production. A subscription must never receive another user's locked or unauthorized wish payload, even briefly. **Effort:** M. **Requirement:** US-02, US-03. **Skip risk:** Realtime becomes a data-disclosure path. **CRITICAL**.
- [ ] **4.4** Provide a polling/refetch fallback and a visible non-intrusive connection state for presentation mode. **Effort:** S. **Requirement:** FR-05. **Skip risk:** The tree appears frozen during a live call when Realtime is unavailable. **MEDIUM**.

## Phase 5 - Acceptance, Release, and Handoff (Sep 22-23)

- [ ] **5.1** Run acceptance tests for every US/FR, including first placement, rejected duplicate placement, complete October Top 3 submission, late-entry access to prior categories, future-category denial, 20th deadline enforcement, team-milestone transitions, ornament inspection, and fullscreen mode. **Effort:** M. **Requirement:** US-01, US-02, US-03, FR-01 to FR-05. **Skip risk:** A stated requirement has no executable proof. **HIGH**.
- [ ] **5.2** Add Playwright coverage for employee placement and wishes, a second user inspecting the ornament, and admin presentation mode; cover desktop and mobile viewports. **Effort:** L. **Requirement:** US-01, US-02, US-03, FR-05. **Skip risk:** Critical cross-user flows fail after deployment. **HIGH**.
- [ ] **5.3** Perform accessibility checks for keyboard-only placement/inspection, modal focus trap/restoration, labels, reduced motion, contrast, and 200% zoom. **Effort:** M. **Requirement:** US-01, US-03, FR-05. **Skip risk:** Team members cannot participate or inspect wishes independently. **HIGH**.
- [ ] **5.4** Execute `pnpm lint`, `pnpm typecheck`, targeted Vitest suites, and relevant Playwright suites; record actual results in this document. **Effort:** M. **Requirement:** —. **Skip risk:** Type, formatting, and behavioral regressions ship. **HIGH**.
- [ ] **5.5** Configure production event dates, approved assets, enabled Realtime tables, feature navigation, observability alerts, and a rollback switch that disables the route without deleting data. **Effort:** M. **Requirement:** FR-02, FR-04, FR-05. **Skip risk:** The feature is technically complete but cannot be safely operated. **HIGH**.
- [ ] **5.6** Complete stakeholder walkthrough and publish a short host runbook covering presentation mode, moderation/escalation, support contact, timezone, and rollback. **Effort:** S. **Requirement:** FR-05. **Skip risk:** The event host cannot resolve issues during the Christmas call. **MEDIUM**.

## Sequencing Constraints

| Order | Work | Why it is sequenced here |
| --- | --- | --- |
| 1 | Identity, event dates, schema, RLS | These define ownership and prevent time-gate bypasses before UI work starts. |
| 2 | Server contract, placement algorithm, telemetry | The client needs a trusted snapshot and safe coordinates; instrumentation needs a pre-launch baseline. |
| 3 | Participant UI | It can then consume one stable, protected contract. |
| 4 | Realtime and presentation mode | These extend the proven read model and should not block the core participation flow. |
| 5 | E2E, accessibility, release readiness | Cross-user behavior and call-time operation must be proven before October 1. |

**Hard constraint:** Do not expose the Christmas Tree route to real users until Phase 1 RLS/time-gate tests and Phase 2 API authorization tests pass. Client-side disabled controls are not an authorization boundary.

## Definition of Done

- [ ] Every requirement in the traceability table has a passing automated or documented acceptance check.
- [ ] One authenticated account can create and own exactly one ornament per event; concurrent duplicate creation is rejected.
- [ ] Only server-authorized slots can be created or edited, and future wish content is never returned to unauthorized clients.
- [ ] The tree remains legible and interactive on supported desktop and mobile viewports.
- [ ] Presentation mode works in fullscreen and receives safe live updates or its fallback refresh path.
- [ ] Production dates, assets, monitoring, rollback, and host runbook are approved by September 23.