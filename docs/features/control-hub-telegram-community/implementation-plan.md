# Control Hub–Telegram Forum Integration Plan

## Summary

Connect the existing Telegram Forum to Control Hub’s IT ticketing and employee-recognition workflows:

- Members create tickets by replying `/ticket` to a post in **General & Ideas** or **Help & Bug Report**.
- The post’s author—or a linked Control Hub admin or super-admin—may perform the conversion.
- Milestone updates for **all IT tickets**, including portal-created tickets, go to **Ticket Progress Feed**.
- HR-approved, evidence-based **Community Highlights** recognize weekly wins and three equal monthly category awardees without ranking employees by XP or app usage.
- Existing private Telegram notifications and leadership project intake remain operational.

Telegram supplies forum routing through `message_thread_id`, identifies senders through `from.id`, and supports targeting a forum topic when sending messages. See the [Telegram Bot API](https://core.telegram.org/bots/api).

## Implementation Changes

### Identity, forum configuration, and persistence

- Add `telegram_account_links` with unique Control Hub user ID, Telegram user ID, private chat ID, username, and link timestamps. Backfill existing private-chat links, where the private chat ID identifies the Telegram user.
- Update the existing `/start <token>` flow to upsert this link while preserving notification preferences. Existing Settings APIs and client response shapes remain compatible.
- Add a self-service, server-confirmed Telegram disconnect action in Settings. It atomically removes the normalized account link, disables Telegram delivery, clears legacy chat metadata and pending link tokens, and writes an audit record so the Telegram identity can be linked to a different Control Hub account.
- Use a dedicated community bot with `TELEGRAM_COMMUNITY_BOT_TOKEN`, `TELEGRAM_COMMUNITY_BOT_USERNAME`, and a fail-closed `TELEGRAM_COMMUNITY_WEBHOOK_SECRET`; preserve the existing bot for private notification and account-linking behavior.
- Add runtime configuration for the existing forum and its four topics:
  - `TELEGRAM_COMMUNITY_CHAT_ID`
  - `TELEGRAM_GENERAL_IDEAS_TOPIC_ID`
  - `TELEGRAM_HELP_BUG_TOPIC_ID`
  - `TELEGRAM_TICKET_PROGRESS_TOPIC_ID`
  - `TELEGRAM_COMMUNITY_HIGHLIGHTS_TOPIC_ID`
- Add an admin-only `/topicid` diagnostic command that returns the current chat and topic IDs before forum routing is configured, enabling initial bootstrap without exposing IDs to unlinked users.
- Extend the Telegram sender utility with a dedicated community sender that accepts `messageThreadId` and reply parameters and returns the created Telegram message ID.
- Add:
  - `ticket_telegram_origins` to uniquely associate a ticket with its source chat, topic, message, and converter.
  - `telegram_ticket_delivery_events` as a durable, idempotent outbox for public ticket milestones.
  - Recognition-period, selection, nomination, and publication records with weekly or monthly period type, Manila period bounds, approval state, reviewer, publication status, and Telegram message ID.
- Keep these integration tables service-role managed; ordinary authenticated users do not receive direct table access.

### `/ticket` conversion workflow

- Handle forum commands before the existing private-chat project-intake branch.
- Accept `/ticket` only when it replies to a text message or media caption in General & Ideas or Help & Bug Report.
- Require the original author to have a linked Control Hub account:
  - The linked author can convert their own message.
  - A linked admin or super-admin can convert another linked member’s message while preserving that member as `submitted_by`.
  - Reject anonymous senders, unlinked authors, unauthorized converters, unsupported topics, and commands without a replied-to message with a concise Telegram explanation.
- Map posts deterministically:
  - General & Ideas → `team=it`, `category=feature_request`.
  - Help & Bug Report → `team=it`, `category=bug_report`.
  - Both use `feature_area=other`, `priority=medium`, and `status=new`; super-admin triage may refine them later.
  - Build the title from the first non-empty line, safely truncated to the ticket schema limit; retain the full text or caption as the description.
- Create the ticket and origin association transactionally. Enforce a unique source chat/message constraint so repeated commands or webhook retries return the existing ticket instead of creating duplicates.
- Reply in the source topic with the ticket reference and confirmation. Media-only posts without captions are rejected in v1; Telegram files are not copied into ticket attachments.

### Public Ticket Progress Feed

- Use a database trigger and outbox entry so creating an IT ticket or changing its status records the Telegram event atomically, including tickets created through the portal.
- Publish separate feed messages for:
  - Created
  - Assigned
  - In progress
  - Waiting on user
  - Resolved
  - Closed
- Suppress triage-only changes, priority changes, reassignment details, comments, attachments, and other internal edits.
- Public messages contain only ticket reference, title, category or feature area, milestone status, and timestamp. Omit submitter and assignee identities, descriptions, comments, attachments, and resolution text.
- Dispatch immediately through an Inngest function with retries; add a recurring sweep for pending or failed outbox rows. Store attempt count, Telegram message ID, last error, and sent time for supportability.
- Do not fail the underlying ticket mutation when Telegram is unavailable. Control Hub remains authoritative and the outbox retries delivery.
- Preserve existing per-user Control Hub, Gmail, and private Telegram notifications.

### Community Highlights

- Keep Project Tracker XP and its leaderboard as product-specific gamification. Do not create equivalent XP for PA, UHP, nominations, logins, sessions, or performance submissions, and do not use Control Hub active days or session counts to rank staff.
- Generate a **Weekly Community Wins** draft each Monday from the previous Manila calendar week. The draft may name any number of staff with concrete achievements and has no rank or forced recipient count.
- Require HR approval before the Monday 4:30 PM Asia/Manila publication. An unapproved draft is not published automatically; a late approval requires an explicit publish action.
- On the first Monday after month-end, replace the weekly post with three equal awards covering the closed Manila calendar month:
  - **Impact & Delivery** — a verified result or completed outcome.
  - **Accountability & Timeliness** — applicable work and required performance submissions completed by their deadlines. This explicitly includes meeting the submission deadlines for OKRs, KPIs, self-evaluations, monthly call feedback, 5% reflections, and quarterly checks.
  - **Collaboration & Initiative** — evidence-backed support, ownership, or process improvement.
- Select one HR-approved recipient per monthly category. Do not publish first-, second-, or third-place rankings or a universal composite score.
- Build the review evidence pool from:
  - Approved Project milestones and verified outcomes, considering complexity rather than raw counts.
  - Completed PA deliverables, deadlines, and supporting evidence; self-marked completion remains subject to HR review.
  - Verified UHP outreach or business outcomes, while excluding client identities and sensitive metrics from public copy.
  - On-time OKR, KPI, self-evaluation, monthly call feedback, 5% reflection, and quarterly check submissions that were applicable to the employee. These are positive deadline-reliability signals under Accountability & Timeliness, not standalone awards or point sources. Use immutable submission timestamps and the applicable deadline only, never private response content or missed-deadline information.
  - Evidence-based nominations for externally tracked work, including nominee, category, work period, concrete result, summary, and optional evidence link.
- Allow active employees to nominate another active employee, but reject self-nominations. Admins and super-admins act as HR approvers in v1.
- Add an HR recognition workspace where approvers review automatic evidence and nominations together, select recipients, edit public copy, approve or reject drafts, explicitly publish late approvals, and review recent recipient history.
- Permit repeated recognition for distinct achievements, but flag recent recipients for HR instead of automatically excluding them.
- Persist weekly and monthly periods, selections, approvals, and publication results so generation and Telegram delivery are idempotent and auditable. Provide an authenticated super-admin retry action for failed publications without allowing duplicate successful posts.
- Keep a separate Control Hub adoption badge as a possible future feature; it is outside v1 and must not be presented as employee-performance recognition.

### Documentation and rollout

- Create and maintain `docs/features/control-hub-telegram-community/task-tracker.md` and `optimization.md` during implementation, covering delivery reliability, privacy choices, relevant code paths, validation, and the forum-to-ticket-to-feed flow.
- Document bot permissions, webhook-secret setup, topic-ID discovery, environment variables, command etiquette, rollback, and delivery-event troubleshooting.
- Update the environment reference and run `graphify update .` after the structural migration, routes, and integration modules are complete.
- Validate against local Supabase first. Production migration, environment configuration, bot administration, and webhook changes require a separately approved production deployment.
- After approval, run a one-week production pilot with a small member group and monitor unauthorized commands, duplicate prevention, failed deliveries, ticket conversion count, and highlight-run status.

## Public Interfaces

- `sendTelegramMessage` gains optional topic and reply fields and returns the sent message ID.
- Telegram webhook input expands to include `update_id`, `message_thread_id`, `from.id`, `reply_to_message`, and caption/text sender metadata.
- A new Inngest event and function handle ticket-delivery outbox dispatch.
- Recognition APIs allow active employees to nominate another employee and allow admins or super-admins to review evidence, edit selections and public copy, approve or reject periods, publish approved periods, and retry failed publications.
- Recognition period responses distinguish weekly and monthly periods and expose Manila period bounds, approval state, selected recipients and categories, publication state, and recent-recipient warnings.
- A super-admin retry endpoint retries a specific failed ticket event or recognition publication.
- The existing Telegram-link endpoint accepts an owner-only `DELETE` request and returns reconciled unlinked notification preferences; administrators cannot disconnect another user's identity.
- Existing ticket API contracts, ticket statuses, notification-preference payloads, and Settings UI remain backward-compatible.

## Test Plan

- Migration tests: constraints, RLS, existing-link backfill, duplicate source prevention, outbox trigger behavior, recognition-period idempotency, nomination access, and local rollback.
- Webhook tests: secret validation, `/start` linking, allowed topics, author conversion, moderator conversion, role rejection, unlinked authors, missing replies, captions, duplicate updates, and preservation of private project intake.
- Account-link tests: self-service disconnect succeeds atomically, rejects unauthenticated and cross-account requests, invalidates pending tokens, disables Telegram delivery, preserves unrelated preferences, and permits the Telegram identity to be linked elsewhere afterward.
- Ticket tests: correct topic mappings, atomic origin creation, every allowed and suppressed milestone, HR-ticket exclusion, IT reclassification behavior, and failures that leave the ticket committed with retryable delivery state.
- Recognition-period tests: Manila weekly and monthly boundaries, first-Monday monthly replacement, variable weekly recipient counts, exactly one monthly recipient per category, no ranking, approval requirements, skipped unapproved posts, explicit late publication, recent-recipient warnings, and duplicate prevention.
- Nomination tests: reject self-nominations and inactive nominees, preserve evidence links and periods, and enforce employee submission plus admin or super-admin review permissions.
- Evidence tests: verify Project, PA, UHP, performance-deadline, and external-nomination adapters independently; include only applicable obligations; compare immutable submission timestamps with the correct deadlines; and never expose evaluation answers, client information, private task content, missed deadlines, or other negative employee information.
- Delivery tests: forum topic routing, Telegram escaping and length limits, transient failures, retry exhaustion, and recovery by the sweep or retry endpoint.
- Focused validation: apply migrations to local Supabase, run the relevant route and service tests and the web typecheck, then replay representative Telegram webhook fixtures. Do not run the broad repository suite unless focused checks expose a shared-contract regression.
- Pilot verification: send real commands from linked author and admin accounts, verify topic placement and public-field redaction, exercise every ticket milestone, and have HR approve one weekly and one monthly recognition period before inspecting their Telegram posts.

## Assumptions

- The requested weekly schedule is Monday at 4:30 PM in `Asia/Manila`.
- Weekly recognition names employees without ranking or a fixed recipient count. On the first Monday after month-end, the three monthly category awards replace the weekly post.
- Admins and super-admins represent HR approvers in v1. Automatic signals and nominations provide evidence, but never select or publish winners without HR approval.
- Project XP remains specific to Project Tracker gamification. App usage is excluded from weekly and monthly recognition decisions.
- Repeated recipients are permitted for distinct achievements and surfaced to HR as a fairness warning rather than blocked.
- All IT ticket titles may appear publicly in the forum; detailed and identity-bearing fields remain private.
- Existing IT tickets are not backfilled into the feed at launch. Their next supported milestone will be published.
- V1 supports replied-to text and captions only; attachment transfer, voice transcription, comment synchronization, and Telegram-to-Control Hub two-way conversations are out of scope.
- The existing forum topics remain in place; implementation only discovers and configures their IDs.
