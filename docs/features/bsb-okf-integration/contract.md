# BSB OKF v0.2 integration contract

## Scope and identity

- Any number of SN Connect / SN Group Google Docs can be sources. An admin pastes a `docs.google.com/document` link or bare file ID into the Approval Register; the server parses it strictly (`parseGoogleDocId`) and rejects anything else. There is no Drive crawling or folder import. `BSB_GOOGLE_DOC_ID` is no longer used (changed 2026-11-24).
- Import opt-in is file-scoped sharing: the service account can only read Docs explicitly shared with it. Each Doc must be shared with the service account as **Editor**, because `permissions.list` returns 403 to a Viewer and approval/chat must read the complete ACL. The API credential keeps the `drive.readonly` scope.
- Each Doc is its own row with its own draft → approved → revoked lifecycle, classification, retention, processor, and reader list. Chat searches only approved, unrevoked rows that list the asking reader, ranks passages locally, then rechecks the live version (metadata only) and the reader's direct ACL for just the Docs that contributed passages. A Doc that fails is dropped from that answer; if all fail, chat returns 404.
- A confirmed Supabase account email maps to a Google Workspace principal by normalized exact email match. An approved row must explicitly list that principal. Chat also rechecks a direct user permission on the current Google Doc. Domain-wide and link-wide sharing do not grant BSB access.
- The Supabase service role is used only by server routes. `bsb_okf_sources` has no client RLS policies. Draft OKF content is separate from the ordinary AI Knowledge tables and embeddings.

## Source and approval state, 2026-11-26

| Item | Evidence/status |
| --- | --- |
| Exact note | User supplied the first Google Doc link. The source is now imported by pasted link through the register; `BSB_GOOGLE_DOC_ID` is no longer used by the app. The service account read this Doc as an untrashed native document. |
| Tenant | User identified SN Connect / SN Group as the source tenant and authorized go-live on November 24. |
| Processor | User chose OpenAI. The source row must explicitly record `openai` before the note can reach that processor. |
| Classification and retention | User supplied `Recording` and `Never` on November 24. The schema represents indefinite retention as `retention_rule=never`. Access expiry is optional; current Drive permission and revocation remain active gates. |
| Release decision | User directed that organizer, business, notice, processing evidence, and separate reviewer fields be disregarded for this first release. The approving admin is recorded in the row. |
| Current Drive ACL | The service account initially read the file but `permissions.list` returned 403. After the user granted it Editor on this Doc, `permissions.list` returned a complete ACL (`canShare=true`, two direct user entries) on November 24. The API credential retains the `drive.readonly` scope. Approval and chat check the ACL again at request time. |
| Approved readers | User named Cef admin (`cefjumaoas29@gmail.com`), granted that email direct Viewer access, and approved the Doc in production on November 25. A user-supplied screenshot shows Cef receiving one cited, verbatim answer in production. A signed-in desktop/mobile browser audit remains outstanding. |
| General sharing | A read-only ACL check on November 26 found an `anyone with the link` Viewer permission alongside Cef and service-account direct permissions. BSB chat does not accept link sharing as authorization, but the Doc itself is readable by people who possess its link. |

## API and publication

- `GET /api/bsb/sources`: admin-only Approval Register metadata; it does not return OKF text. `GET /api/bsb/sources?id=<uuid>` returns only draft passages after checking the requesting admin's confirmed email against the current Google permission list and verifying the Doc has not changed. Admins can see register metadata without direct Doc permission, but not passages.
- `POST /api/bsb/sources`: admin-only Google Docs export to a private draft, after confirming the importing admin has their own direct Google permission. No Drive enumeration, model call, or ordinary AI Knowledge indexing.
- `PATCH /api/bsb/sources`: an active admin records classification, retention, processor, and allowed reader emails. Approval requires the approving admin's direct Google permission, the current source version, and each reader's direct Drive ACL. Revocation removes readers immediately. Import, approval, and revocation are server-confirmed mutations.
- `POST /api/bsb/chat`: requires a confirmed active admin account, explicit principal grant, live approval and retention rule, unchanged source version, and current direct Drive permission. The server selects from verbatim OKF passages through OpenAI, validates the selected passage ID, and returns only that exact quote with a citation. Unsupported questions abstain. It has no semantic cache or ordinary AI Knowledge fallback. Requests are limited to 20 per account per hour; Google and OpenAI calls have timeouts.

The OKF v0.2 draft stores the full exported text verbatim as `sourceText` and derives bounded passages that must each occur in that snapshot. It does not infer commitments, owners, or decisions from the note. The model receives only candidate passages after approval and may select one ID or abstain; source instructions cannot become response instructions.

A read-only export of the exact Doc on November 24 produced 26,439 characters and 62 bounded passages, within the parser limits. The text was not logged or saved in the repository. It was imported as one private draft into **local** Supabase and was not sent to a model at import time. A later authorized local chat test sent selected passages to OpenAI.

A fresh export was compared with the stored local `sourceText` by exact string equality; all 62 passages were verified as substrings of that snapshot. The checks returned true without printing the note.

## Validation state

All four BSB SQL migrations were applied to local and production Supabase on November 24. Local direct table reads by anon and authenticated roles were denied with `42501`. The local approved-reader, stale-version, revocation, and citation cycle passed with a real OpenAI call. Production was released on November 24; the first real source was approved on November 25 and a user-supplied screenshot shows one cited answer as Cef. The November 26 audit did not independently repeat that signed-in production journey; see the [optimization and audit record](optimization.md).
