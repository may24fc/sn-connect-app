# BSB OKF v0.2 integration contract

## Scope and identity

- One SN Connect / SN Group Google Doc is selected by `BSB_GOOGLE_DOC_ID` in server configuration. The ID is never sent in the import request or shipped in client code.
- A confirmed Supabase account email maps to a Google Workspace principal by normalized exact email match. An approved row must explicitly list that principal. Chat also rechecks a direct user permission on the current Google Doc. Domain-wide and link-wide sharing do not grant BSB access.
- The Supabase service role is used only by server routes. `bsb_okf_sources` has no client RLS policies. Draft OKF content is separate from the ordinary AI Knowledge tables and embeddings.

## Source and approval state, 2026-11-24

| Item | Evidence/status |
| --- | --- |
| Exact note | User supplied a Google Doc link; its ID is in ignored local server configuration. The configured Google service account read this exact Google Doc as an untrashed native document. |
| Tenant | User identified SN Connect / SN Group as the source tenant and authorized go-live on November 24. |
| Processor | User chose OpenAI. The source row must explicitly record `openai` before the note can reach that processor. |
| Classification and retention | User supplied `Recording` and `Never` on November 24. The schema represents indefinite retention as `retention_rule=never`. Access expiry is optional; current Drive permission and revocation remain active gates. |
| Release decision | User directed that organizer, business, notice, processing evidence, and separate reviewer fields be disregarded for this first release. The approving admin is recorded in the row. |
| Current Drive ACL | The service account initially read the file but `permissions.list` returned 403. After the user granted it Editor on this Doc, `permissions.list` returned a complete ACL (`canShare=true`, two direct user entries) on November 24. The API credential retains the `drive.readonly` scope. Approval and chat check the ACL again at request time. |
| Approved readers | User named Cef admin (`cefjumaoas29@gmail.com`). The owner then granted that email direct Viewer access; a complete ACL check confirmed `role=reader` on November 24. The production SN Connect login email must still be verified, and the register must name Cef before chat access is enabled. |

## API and publication

- `GET /api/bsb/sources`: admin-only Approval Register, including draft passages for human review.
- `POST /api/bsb/sources`: admin-only, exact-ID Google Docs export to a private draft. No Drive enumeration, model call, or ordinary AI Knowledge indexing.
- `PATCH /api/bsb/sources`: an active admin records classification, retention, processor, and allowed reader emails. Approval requires the current source version and each reader's direct Drive ACL. Revocation removes readers immediately. Import, approval, and revocation are server-confirmed mutations.
- `POST /api/bsb/chat`: requires a confirmed active admin account, explicit principal grant, live approval and retention rule, unchanged source version, and current direct Drive permission. The server selects from verbatim OKF passages through OpenAI, validates the selected passage ID, and returns only that exact quote with a citation. Unsupported questions abstain. It has no semantic cache or ordinary AI Knowledge fallback. Requests are limited to 20 per account per hour; Google and OpenAI calls have timeouts.

The OKF v0.2 draft stores the full exported text verbatim as `sourceText` and derives bounded passages that must each occur in that snapshot. It does not infer commitments, owners, or decisions from the note. The model receives only candidate passages after approval and may select one ID or abstain; source instructions cannot become response instructions.

A read-only export of the exact Doc on November 24 produced 26,439 characters and 62 bounded passages, within the parser limits. The text was not logged or saved in the repository. It was imported as one private draft into **local** Supabase; it was not sent to a model.

A fresh export was compared with the stored local `sourceText` by exact string equality; all 62 passages were verified as substrings of that snapshot. The checks returned true without printing the note.

## Local validation limits

All four BSB SQL migrations were applied to **local** Supabase on November 24. The local draft is unapproved with no reader grants. Direct table reads by anon and authenticated roles were denied with `42501`; BSB chat returned generic 404 for anonymous and locally authenticated users while the source was unapproved. The user authorized production release, but the production deployment path and account mapping still need verification.
