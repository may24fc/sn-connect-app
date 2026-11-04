# Projects API

All routes require an active authenticated user. Project-management operations are
authorized server-side; database policies and triggers also prevent direct authenticated
clients from bypassing the individual-consent boundary.

## Project leadership and membership

`projects.lead_user_id` is the primary lead. A `project_contributors` row with role
`lead` is a co-lead with project-management access; role `contributor` does not itself
grant lead management rights. Project creators, supervisors, appointed department
leads, and administrators may have separate management rights. Existing contributors
marked `lead` are upgraded to co-leads when the co-lead migration is applied.

An active actor can directly add themselves or a person whose current department the
actor actively leads. For everyone else, including assignments by administrators,
a new membership or promotion to lead requires an individual invitation. Existing
memberships remain unchanged until an invitation is accepted.

### `POST /api/projects`

Provide the existing project fields plus `leadUserId` and optional `coLeadUserIds`.
Creation, direct leads, the initial project department, invitations, and in-app
notifications commit in one transaction. The response contains the full project in
`data`; this example omits its other fields:

```json
{
  "data": { "id": "project-uuid" },
  "pendingInvitationCount": 1,
  "pendingPrimary": true
}
```

If the proposed primary requires an invitation, the creator is initially primary.
The invited person becomes primary on acceptance only if the primary has not changed
in the meantime; otherwise they become a co-lead. Their department is not automatically
added to the project. Non-admins cannot assign a supervisor during creation; an admin
cannot directly appoint an out-of-scope person as supervisor.

### `POST /api/projects/[id]/contributors`

Provide `{ "userId": "uuid", "role": "lead" | "contributor" }`. A successful response
includes `{ "ok": true, "outcome": "assigned" | "invited" }`; `invited` means no new
membership or lead access is granted yet. A duplicate pending invitation returns `409`.
Existing primary leads cannot be demoted. Removing a member also cancels that person's
pending invitation atomically.

`GET /api/projects/[id]/contributors?search=...` returns candidate identities and a
`requires_invitation` flag to authorized project managers.

### `PATCH /api/projects/[id]`

Submit a `leadUserId` or `supervisorId` change separately from other project fields.
An out-of-scope primary change creates an invitation and returns `invitationSent: true`
with the current project; it does not change the primary until acceptance. Only admins
can change supervisors. To make an out-of-scope person a supervisor, they must first
accept a project-lead invitation.

## Individual invitations

- `GET /api/projects/invitations` returns the caller's pending invitations with project
  previews and inviter names, without granting project access.
- `POST /api/projects/invitations/[id]` accepts `{ "action": "accept" | "decline" }`.
  Only the intended active recipient can respond; answered or cancelled invitations
  return `409`. Acceptance and the inviter's notification are transactional.
- `GET /api/projects/[id]/invitations` lists pending invitations for project managers.
- `DELETE /api/projects/[id]/invitations?invitationId=...` cancels a pending invitation
  and notifies the recipient.

The invitation and its notification are committed together. A unique pending invitation
per person and project prevents duplicates. Project-linked task assignment cannot
implicitly create an out-of-scope or pending project membership; invite the person and
wait for acceptance first. Task assignment retains its separate eligibility checks.

The migrations are `20261104000003_project_co_leads.sql` and
`20261104000004_project_member_invitations.sql`. They were applied locally and in
production on 2026-11-04. Application rollout must include the corresponding API and UI
changes; future migrations follow the environment's deployment policy.
