# Control Hub Telegram Community Deployment Runbook

Production rollout is not part of the local implementation. Use this runbook only after explicit production approval.

## Prerequisites

- Create a dedicated Control Hub Forum bot and add it to the Telegram Forum. Keep the existing notification/linking bot and its n8n `Control Hub Notifications` credential unchanged.
- Allow it to read forum messages and send messages in General & Ideas, Help & Bug Report, Ticket Progress Feed, and Community Highlights. If Telegram privacy mode prevents replied-to command context from reaching the webhook, update the BotFather group privacy setting deliberately and document the change.
- Keep ticket-title visibility in mind: titles are public in Ticket Progress Feed; descriptions, people, comments, attachments, assignments, and resolution notes are never posted.
- Set `TELEGRAM_COMMUNITY_BOT_TOKEN`, `TELEGRAM_COMMUNITY_BOT_USERNAME`, a strong `TELEGRAM_COMMUNITY_WEBHOOK_SECRET`, and `CRON_SECRET` in the production web project. Do not overwrite the existing `TELEGRAM_BOT_*` variables.

## Topic discovery and environment

1. Deploy the database and application changes, including the dedicated `/api/webhooks/telegram-community` endpoint.
2. Register the dedicated community bot webhook with Telegram using `TELEGRAM_COMMUNITY_WEBHOOK_SECRET`.
3. Link an admin or super-admin Telegram account through the existing Control Hub Settings bot. Telegram user IDs are shared across bots, so the community bot can use the normalized account link.
4. In each forum topic, send `/topicid` and record the returned chat/topic values. This diagnostic intentionally works before the community chat ID is configured, but only for linked admins and super-admins.
5. Configure:
   - `TELEGRAM_COMMUNITY_CHAT_ID`
   - `TELEGRAM_GENERAL_IDEAS_TOPIC_ID`
   - `TELEGRAM_HELP_BUG_TOPIC_ID`
   - `TELEGRAM_TICKET_PROGRESS_TOPIC_ID`
   - `TELEGRAM_COMMUNITY_HIGHLIGHTS_TOPIC_ID`
6. Redeploy after environment changes.

## Smoke test

- Link one employee and one admin account.
- In General & Ideas, have the linked employee reply `/ticket` to their own text post. Confirm one feature-request ticket is created and a Created milestone appears in Ticket Progress Feed.
- Repeat `/ticket` on the same source post and confirm the existing reference is returned without a duplicate.
- In Help & Bug Report, have the linked admin convert another linked employee’s post and confirm the original author remains the submitter.
- Exercise Assigned, In progress, Waiting on user, Resolved, and Closed and confirm only the public-safe fields appear.
- Have HR review a weekly draft, approve it, and publish it. Separately verify a three-category monthly draft.
- Inspect the forum posts directly for names or content that should remain private.

## Operations and troubleshooting

- Failed ticket posts remain in `telegram_ticket_delivery_events`; Inngest retries and the ten-minute sweep requeues pending/failed rows. A super-admin may retry a failed row through `POST /api/admin/telegram-ticket-deliveries/<id>/retry`.
- Recognition periods record `status`, `last_error`, reviewer, publisher, and Telegram message ID. A failed period must be reviewed/approved again before an explicit retry.
- `publishing` and `sending` are claim states that prevent concurrent duplicate sends. Investigate a long-lived claim before changing it manually.
- If `/ticket` is ignored, verify the webhook secret, forum chat ID, topic ID, bot privacy mode, and both users’ `telegram_account_links` rows.
- Do not paste client details, performance answers, ticket descriptions, or negative employee information into edited public recognition copy.

## Rollback

1. Remove the five forum environment variables or remove the bot’s forum posting permission to stop new public delivery while retaining records.
2. Disable the two recognition Vercel cron entries if scheduled generation/publication must stop.
3. Keep the outbox and recognition tables for audit and recovery; do not delete them during an operational rollback.
4. Revert the application deployment. Apply database down changes only through a separately reviewed migration because the tables contain audit and idempotency state.

## Pilot

Run a one-week pilot with a small member group. Review unauthorized commands, duplicate attempts, failed deliveries, conversion counts, skipped/unapproved recognition periods, public-field redaction, and HR feedback before broadening access.
