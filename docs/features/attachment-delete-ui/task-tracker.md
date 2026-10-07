# Attachment Delete UI Task Tracker

## Current Status

Every web-app surface that already allowed deleting an uploaded image, file, or attachment now uses one shared control, `AttachmentDeleteButton`, behind the same confirmation dialog. Surfaces where a delete would break a workflow were audited and deliberately left without one. Implemented and typechecked; not click-tested; not committed or deployed.

## Tasks

### Done
- [x] Audit image and attachment UIs - 2026-10-07; read-only sweep of `apps/web/src` and `packages/ui/src`. Found 7 surfaces with an existing delete (all styled differently; only /files confirmed, with a one-off dialog) and several upload displays without one (listed under Skipped).
- [x] Shared delete control - 2026-10-07; added `apps/web/src/components/attachments/AttachmentDeleteButton.tsx` and `tests/components/AttachmentDeleteButton.test.tsx` (4 passed). Two variants: `overlay` (small round red button on the corner of an image) and `inline` (red ghost icon button in rows and action groups). Always opens `ConfirmActionDialog` with "Delete {kind}?" / "\"{name}\" will be deleted. This can't be undone." / "Delete {kind}". If `onConfirm` returns a promise the dialog shows "Working..." until it settles; stops click propagation so clickable rows and cards don't open.
- [x] Adopt it everywhere a delete already existed - 2026-10-07; changed `apps/web/src/components/uhp/UhpClientDetailDialog.tsx` (screenshots, overlay), `apps/web/src/components/reports/MarketingReportEditor.tsx` (content image, overlay; previously an unconfirmed "Remove image" button), `apps/web/src/app/(app)/(employee)/files/page.tsx` (grid toolbar and list; replaced the one-off confirmation dialog), `apps/web/src/app/(app)/(employee)/pa-tasks/page.tsx`, `apps/web/src/components/performance/OKRDetailWorkspace.tsx`, `apps/web/src/app/(app)/(admin)/admin/announcements/[id]/page.tsx` (was a text "Delete" button), `apps/web/src/app/(app)/(employee)/projects/[id]/page.tsx`. PA tasks, OKR evidence, announcements and project documentation previously deleted on a single click with no confirmation. Mutation and cache behavior is unchanged on every surface (optimistic ones stay optimistic, server-confirmed ones now show the pending state in the dialog). Validation: `pnpm --filter web typecheck` passed; Biome reports no errors on changed lines (7 errors remain on untouched lines in these files).
- [x] Fix hidden image on reopened marketing drafts - 2026-10-07; `MarketingReportEditor.tsx`. Hydration restored `imagePath` but not `imagePreviewUrl`, so a saved draft showed the empty upload box, hid its image and its delete button, and re-uploading orphaned the old file. The editor now renders `MarketingContentImagePreview` (signed URL from the path) when only the path is known.

- [x] Marketing images are deleted only once no saved report uses them - 2026-10-07; `MarketingReportEditor.tsx`. Tracks image paths in the last saved report (from hydration, then each save) and images uploaded this session. Removing an image the saved draft still uses only clears it from the form; after every successful save (manual, submit, or the 10-second auto-save) any tracked image the saved report no longer uses and that is not on the form is deleted. Images never saved are still deleted immediately. This also cleans up images dropped by changing report type or deleting a metric row, which previously orphaned files. Validation: typecheck only (no component harness for this editor); not click-tested.
- [x] Validate the content-image DELETE path - 2026-10-07; `apps/web/src/app/api/reports/content-images/route.ts` now accepts only `<userId>/<uuid>.<jpeg|png|webp>` via Zod (blocks `../` and other users' folders). Tested in `tests/api/attachment-delete-routes.test.ts`.
- [x] Block deleting /files documents that back an invoice or expense - 2026-10-07; `apps/web/src/app/api/documents/[id]/route.ts` returns 409 ("This document is attached to an invoice/an expense. Remove it from there instead.") when a live `invoices.document_id` or `expense_entries.receipt_document_id` points at it; id validated with Zod. /files now shows the server's message in the error toast. Tested (3 cases).
- [x] KPI evidence delete removes the stored file - 2026-10-07; `apps/web/src/app/api/performance/kpis/[id]/evidence/route.ts` now removes the `kpi-evidence` object for file evidence (matching OKR evidence), scopes the evidence to the KPI in the URL, and validates both ids with Zod. Tested (2 cases).
- [x] Onboarding document removal - 2026-10-07; added `apps/web/src/hooks/useDeleteOnboardingDocument.ts` (server-confirmed; recorded in `docs/apps/web/architecture/optimistic-ui.md`); changed `apps/web/src/app/api/onboarding/documents/[id]/route.ts` and `apps/web/src/app/(app)/(employee)/onboarding/setup/components/StepDocuments.tsx` (delete button on each uploaded file, with its document type). Rule: employees may remove their own uploads while setup is in progress or after HR rejects the submission; once submitted for review (or approved) the route returns 409. Onboarding admins keep their existing access. Tested (4 cases).

- [x] Announcement attachment delete safeguards - 2026-10-07; rewrote `apps/web/src/app/api/announcements/[id]/attachments/[attachmentId]/route.ts` and changed `apps/web/src/app/(app)/(admin)/admin/announcements/[id]/page.tsx`. Decision: keep permanent delete at every status, including published, because admins must be able to pull a wrong or sensitive file from a live announcement; a publish lock or soft delete would block that. Fixed instead: deletes the row before the stored file (previously the file went first, so a failed row delete left a broken attachment); scopes the attachment to the announcement in the URL; validates ids with Zod; writes a `delete_announcement_attachment` audit entry (announcement id and MIME type only); logs storage failures. The confirmation on a published announcement now says employees will lose access to the file. Tested (3 cases, including operation order).
- [x] Admin delete on the onboarding review screen - 2026-10-07; `apps/web/src/components/admin/OnboardingDocumentsPanel.tsx` now has the shared delete button next to Preview/Download, using `useDeleteOnboardingDocument` (server-confirmed). The confirmation names the document type and says the employee must upload it again; the "Missing documents" notice picks it up after the list refreshes. API permissions unchanged (onboarding admins could already delete).

### In Progress

None.

### Deferred

None.
- [ ] Draft EOD form "Remove" (`packages/ui/src/components/internship/EODReportForm.tsx`) - Deferred: lives in `packages/ui`, which cannot import the web-app component, and removal is unsaved local state, so no confirmation is needed. Resume: if visual parity matters, move `AttachmentDeleteButton` into `packages/ui`.

### Skipped
- EOD attachment gallery (`apps/web/src/components/admin/EODAttachmentGallery.tsx`) - admin-facing; the logs route only lets the owning intern change attachments, and only on drafts (`'Only draft logs can be edited'`).
- Invoice document previews (employee and admin invoice pages) - the uploaded file is the invoice; submit OCRs it and takes the invoice number from it. A draft "replace file" would be the right feature, not delete.
- Expense receipt preview (`expenses/verify`) - the receipt is the OCR source for the entry; entry-level delete already exists with its own status lock.
- Ticket attachments - no DELETE route, no `deleted_at`, and tickets reach resolved/closed.
- Admin KPI/OKR evidence review and admin marketing report preview - assessment and review views; read-only by design.
- Task proofs - links and notes, not uploads.

### Blocked

None.

## Session History
- 2026-10-07 (open items): Closed the last two items. Announcements keep permanent delete by design (removing a wrong file from a live announcement must stay possible) but gained operation ordering, scoping, validation, audit, and a published warning. Onboarding review screen gained the admin delete. Validation: 13 route tests and 4 component tests passed, typecheck and Biome clean on changed files. Nothing deferred remains in this tracker; click-testing is still outstanding.
- 2026-10-07 (fixes): Fixed the four problems deferred from the audit: marketing image deletion now waits for a save, /files refuses documents backing invoices or expenses, KPI evidence removes its file, and onboarding documents can be removed by employees until submission. Decisions: marketing cleanup runs after every successful save, which also catches images dropped by report-type changes; onboarding lock allows edits after a rejection so employees can fix what HR sent back. Validation: 10 new route tests passed, typecheck passed. Remaining: click-test; announcement attachment hard-delete; admin delete on the onboarding review screen.
- 2026-10-07: Audited image and attachment UIs and standardized every existing delete on `AttachmentDeleteButton` with the shared confirmation. Decisions: no new delete actions where workflows lock the upload; keep each feature's existing optimistic or server-confirmed behavior rather than change cache semantics in a UI pass; /files keeps its hover toolbar layout with the shared button styled to match its siblings. Fixed the marketing draft image hydration bug because it hid the delete control. Remaining: deferred items above; click-test each surface.
