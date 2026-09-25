# Optimistic UI Rollout

> Audience: Developers and coding agents  
> Status: Adopted  
> Last updated: 2026-09-24

## Decision

Use optimistic UI for user-initiated mutations whose resulting state is deterministic, reversible, and visible in the current view. The application must show the intended state immediately, restore the previous state if the request fails, and reconcile with the server after the request settles.

Do not treat a loading spinner as optimistic UI. A pending indicator may accompany an optimistic update, but it must not delay the visible state change.

## Standard mutation contract

TanStack Query mutations that qualify for optimistic UI follow this sequence:

1. `onMutate`: cancel affected queries and snapshot every affected cache entry with `getQueriesData` when a query family has filtered or paginated variants.
2. Apply the deterministic cache update with `setQueryData` or `setQueriesData`.
3. `onError`: restore every snapshot exactly.
4. `onSuccess`: replace a temporary optimistic record with the server record when the mutation creates one.
5. `onSettled`: invalidate the relevant query family to reconcile server-computed fields, ordering, counts, permissions, and concurrent edits.

Use `queryKeys` from `apps/web/src/lib/query-keys.ts`; do not introduce ad-hoc string keys. Keep the mutation in a shared hook when multiple screens use it.

## When to use it

Suitable interactions include:

- Read, starred, pinned, bookmarked, selected, and other local toggle state.
- Checklist completion, task status, inline edits, and list removal when the user has already confirmed the action.
- Comments, proofs, and lightweight records rendered on the current screen. Create these with a temporary client ID, then replace that item with the API response.
- Reversible membership and access changes when the current screen renders the affected list.

## When not to use it

Keep the UI server-confirmed for mutations with non-deterministic, irreversible, security-sensitive, or externally visible outcomes:

- Authentication, invitations, onboarding approval, hiring, payroll or invoice approval.
- File upload, import, OCR/parsing, bulk processing, and background jobs.
- Sending reminders or email, publishing externally visible content, and server-generated links.
- Concurrency-sensitive claims or actions whose authorization can change before the request completes.

These flows should provide explicit pending progress and clear success/failure feedback instead.

## Implemented rollout

The initial rollout added optimistic updates with rollback and reconciliation to:

| Area | Mutations |
| --- | --- |
| Notifications | Mark one/all read; delete |
| Announcement experience | Star/unstar, mark read, pin, add comment |
| Information hub | Add/remove bookmark |
| Preferences | Update notification preferences |
| Tasks and support | Add task/ticket comments; add/remove task proofs; update/delete PA tasks |
| Checklists | Employee onboarding and offboarding completion; project checklist update/delete |
| Wellness Bingo | Board tiles/custom habit, partner, weekly recording |
| Recruitment | Application status update and removal |
| Reports | Archive/restore and approve/reject list transitions |
| Performance | OKR, KPI, and target edits/deletes; KPI and target evidence deletion |
| Revenue forecast | Entry upsert/update/delete and goal create/delete |
| Expenses | Verification fields, matching, leadership decision, and deletion |
| Directory | Employee edit, deactivate, and restore |
| UHP workspace | Client and VP creates; client status/activity/note changes; VP target/edit/delete changes; access grant revocation |
| Christmas Tree | Ornament placement/move/delete and wish add/edit/delete |
| Onboarding checklist | Task create/edit/delete, clear, and default-template edits |
| Offboarding checklist | Task create/edit/delete, clear, default-template edits, and template application |

The rollout also corrected rollback coverage in `useUpdateTask` and `useToggleResourceFeatured`: both now snapshot every matching list cache rather than only an umbrella key.

## Remaining rollout candidates

Apply this standard when touching these surfaces, prioritizing interactions visible in the same list or detail view:

- Resource collections/categories/folders, resource archive/restore, and resource membership.
- CRM and AI-spending inline CRUD.
- Project, milestone, contributor, and link-documentation edits.
- Access-grant list changes outside the UHP workspace.

Do not add optimistic behavior mechanically. Confirm the operation meets the criteria above, identify every query variant it affects, and add an error-path test or focused manual failure check.

## Maintenance rule

Before changing a client mutation, read this document and classify it as optimistic or server-confirmed. When adding a new cross-cutting mutation pattern, changing the standard, or completing a rollout area, update this document in the same change.
