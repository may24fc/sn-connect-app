# n8n Workflows - Resources / Information Hub

This directory contains n8n automation workflows for the SN Connect HR Portal Resources / Information Hub feature (Section 2.5), plus Phase 3 orchestration setup for notifications (Section 3.2).

## Phase 3.1 Setup Notes

### Docker Compose

- File: `n8n/docker-compose.yml`
- Starts `n8n` with a PostgreSQL backend for n8n metadata (`DB_TYPE=postgresdb`)
- Exposes `5678` by default (configurable via `N8N_PORT`)
- Includes environment variables used by the notification workflows and webhook validation route

### Webhook Validation Route

- File: `apps/web/src/app/api/webhooks/n8n/route.ts`
- Validation endpoint: `POST /api/webhooks/n8n`
- Health + config endpoint: `GET /api/webhooks/n8n`
- Supported auth headers:
   - `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
   - `X-N8N-Webhook-Secret: <N8N_WEBHOOK_SECRET>`
   - `X-N8N-Signature: <hmac_sha256_of_raw_body>`

### Webhook URLs

- `POST /webhook/resources/published` (n8n resource notification workflow)
- `POST /api/webhooks/n8n` (application-side webhook validator)

### Notification Workflow Files (Section 3.2)

- `notifications-birthday-reminder.json`
- `notifications-anniversary-reminder.json`
- `notifications-payroll-reminder.json`
- `notifications-probation-ending.json`

## Workflow Files

### 1. resources-auto-publish.json

**Purpose:** Automatically publish resources that have a scheduled publish date.

**Trigger:** Cron schedule - runs every 15 minutes

**Logic:**
1. Query resources with `status='draft'` and `published_at <= now()`
2. Check if any resources are found
3. If found:
   - Update status to `'published'`
   - Create audit logs for each published resource
   - Trigger notification webhook to alert users
   - Send summary email to admins
4. If none found:
   - Log "no resources to publish" to audit logs
5. On error:
   - Log error to audit logs
   - Send error alert email to admins

**Database Operations:**
- Reads: `public.resources` (draft with scheduled publish date)
- Writes: `public.resources` (update status), `public.audit_logs`

**Environment Variables Required:**
- `SUPABASE_POSTGRES_CREDENTIAL_ID` - Supabase database connection
- `N8N_WEBHOOK_URL` - Base URL for n8n webhooks
- `N8N_WEBHOOK_AUTH_ID` - Webhook authentication credential

---

### 2. resources-auto-expire.json

**Purpose:** Automatically archive resources that have reached their expiration date.

**Trigger:** Cron schedule - runs daily at midnight (00:00)

**Logic:**
1. Query resources with `status='published'` and `expires_at <= now()`
2. Check if any expired resources are found
3. If found:
   - Update status to `'archived'`
   - Create detailed audit logs with expiration metadata
   - Send summary email to admins with list of archived resources
4. If none found:
   - Log "no expired resources" to audit logs
5. On error:
   - Log error to audit logs with stack trace
   - Send error alert email to admins

**Database Operations:**
- Reads: `public.resources` (published with expiration date)
- Writes: `public.resources` (update status), `public.audit_logs`

**Environment Variables Required:**
- `SUPABASE_POSTGRES_CREDENTIAL_ID` - Supabase database connection

---

### 3. resources-new-notification.json

**Purpose:** Send notifications to targeted users when a new resource is published.

**Trigger:** Webhook (POST to `/resources/published`)

**Logic:**
1. Receive webhook payload with resource ID
2. Extract resource ID from payload
3. Query resource details (title, category, type, targeting, author)
4. Check if resource exists and is published
5. If resource found:
   - Query targeted users based on:
     - `is_public` flag (all users)
     - `target_roles` (specific roles)
     - `target_departments` (specific departments)
     - `target_employees` (specific individuals)
   - Build notification payloads for each user
   - Split users into batches of 50
   - Send email notifications to each user
   - Send Slack notification to admin channel
   - Create audit log for notification event
6. If resource not found:
   - Log "resource not found" to audit logs
   - Stop workflow
7. On error:
   - Log error to audit logs
   - Send error alert email to admins

**Database Operations:**
- Reads: `public.resources`, `public.users`
- Writes: `public.audit_logs`

**Environment Variables Required:**
- `SUPABASE_POSTGRES_CREDENTIAL_ID` - Supabase database connection
- `SLACK_WEBHOOK_URL` - Slack webhook for admin notifications

**Webhook Payload Format:**
```json
{
  "resources": [
    {
      "id": "uuid-of-resource",
      "title": "Resource Title",
      "category": "onboarding"
    }
  ],
  "event": "auto_published",
  "timestamp": "2026-02-15T00:00:00Z"
}
```

Or simplified format:
```json
{
  "id": "uuid-of-resource"
}
```

---

## Setup Instructions

### 1. Import Workflows to n8n

1. Log in to your n8n instance (self-hosted or cloud)
2. Navigate to **Workflows** > **Import from File**
3. Upload each JSON file:
   - `resources-auto-publish.json`
   - `resources-auto-expire.json`
   - `resources-new-notification.json`
   - `notifications-birthday-reminder.json`
   - `notifications-anniversary-reminder.json`
   - `notifications-payroll-reminder.json`
   - `notifications-probation-ending.json`

### 2. Configure Credentials

#### Supabase Postgres Connection

1. In n8n, go to **Credentials** > **New**
2. Select **Postgres**
3. Configure:
   - **Name:** `Supabase Postgres`
   - **Host:** Your Supabase project database URL (e.g., `db.xxxxx.supabase.co`)
   - **Database:** `postgres`
   - **User:** `postgres` or service role user
   - **Password:** Your Supabase database password
   - **Port:** `5432`
   - **SSL:** Enabled
4. Test connection and save
5. Note the credential ID and update workflow files if needed

#### n8n Webhook Authentication

1. In n8n, go to **Credentials** > **New**
2. Select **Header Auth**
3. Configure:
   - **Name:** `n8n Webhook Auth`
   - **Header Name:** `X-N8N-API-KEY`
   - **Header Value:** Generate a secure random key (e.g., `openssl rand -hex 32`)
4. Save the credential

#### Email Send (SMTP)

1. In n8n, go to **Credentials** > **New**
2. Select **SMTP**
3. Configure your email provider settings (Gmail, SendGrid, etc.)
4. Test and save

#### Slack Webhook (Optional)

1. Create a Slack Incoming Webhook in your Slack workspace
2. Copy the webhook URL
3. Add to n8n environment variables as `SLACK_WEBHOOK_URL`

### 3. Configure Environment Variables

Add these to your n8n instance (docker-compose.yml or cloud settings):

```yaml
environment:
  - N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
  - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 4. Update Workflow Credential References

In each workflow file, ensure the credential IDs match your n8n instance:

- Replace `SUPABASE_POSTGRES_CREDENTIAL_ID` with your actual credential ID
- Replace `N8N_WEBHOOK_AUTH_ID` with your actual credential ID

### 5. Activate Workflows

1. Open each workflow in n8n
2. Click **Active** toggle to enable
3. Verify the workflow is running:
   - Check execution history
   - Monitor logs for errors

---

## Testing

### Test App Webhook Dispatcher (`/api/webhooks/n8n`)

Set environment variables first:

```bash
export WEB_APP_URL="http://localhost:3000"
export N8N_WEBHOOK_SECRET="change-me"
```

Then test each event through the app validator+dispatcher endpoint:

```bash
# 1) Resources published
curl -X POST "$WEB_APP_URL/api/webhooks/n8n" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
   -d '{
      "event": "resources.published",
      "workflow": "resources-new-notification",
      "timestamp": "2026-02-15T08:00:00Z",
      "data": { "resourceId": "00000000-0000-0000-0000-000000000001" }
   }'

# 2) Birthday reminder
curl -X POST "$WEB_APP_URL/api/webhooks/n8n" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
   -d '{
      "event": "notifications.birthday",
      "workflow": "notifications-birthday-reminder",
      "timestamp": "2026-02-15T08:00:00Z",
      "data": { "source": "manual-smoke-test" }
   }'

# 3) Anniversary reminder
curl -X POST "$WEB_APP_URL/api/webhooks/n8n" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
   -d '{
      "event": "notifications.anniversary",
      "workflow": "notifications-anniversary-reminder",
      "timestamp": "2026-02-15T08:00:00Z",
      "data": { "source": "manual-smoke-test" }
   }'

# 4) Payroll reminder
curl -X POST "$WEB_APP_URL/api/webhooks/n8n" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
   -d '{
      "event": "notifications.payroll",
      "workflow": "notifications-payroll-reminder",
      "timestamp": "2026-02-15T08:00:00Z",
      "data": { "source": "manual-smoke-test" }
   }'

# 5) Probation ending reminder
curl -X POST "$WEB_APP_URL/api/webhooks/n8n" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
   -d '{
      "event": "notifications.probation-ending",
      "workflow": "notifications-probation-ending",
      "timestamp": "2026-02-15T08:00:00Z",
      "data": { "source": "manual-smoke-test" }
   }'
```

Expected result:
- API returns `200` with `ok: true` and includes `destinationUrl`.
- If downstream n8n workflow endpoint is missing/unavailable, API returns `502` with `n8nStatus` and `n8nBody`.

### Test Auto-Publish Workflow

1. Create a test resource in the database:
   ```sql
   INSERT INTO public.resources (
     title, description, resource_type, category, status, published_at, author_id
   ) VALUES (
     'Test Resource', 'Test Description', 'document', 'onboarding', 'draft', now() - interval '5 minutes', 'user-uuid'
   );
   ```

2. Wait for the next cron trigger (max 15 minutes) or manually execute the workflow

3. Verify the resource status changed to `'published'`

### Test Auto-Expire Workflow

1. Create a test resource with expiration:
   ```sql
   INSERT INTO public.resources (
     title, resource_type, category, status, published_at, expires_at, author_id
   ) VALUES (
     'Test Expiring Resource', 'document', 'onboarding', 'published', now() - interval '1 day', now() - interval '1 hour', 'user-uuid'
   );
   ```

2. Wait for the next midnight cron trigger or manually execute the workflow

3. Verify the resource status changed to `'archived'`

### Test Notification Workflow

1. Get the webhook URL from n8n (open the workflow, click on the Webhook node)

2. Send a test POST request:
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/resources/published \
     -H "Content-Type: application/json" \
     -H "X-N8N-API-KEY: your-api-key" \
     -d '{"resources": [{"id": "your-resource-uuid"}]}'
   ```

3. Verify:
   - Email notifications sent to targeted users
   - Slack notification sent to admin channel
   - Audit log created

---

## Monitoring

### Check Workflow Executions

1. In n8n, navigate to **Executions**
2. Filter by workflow name
3. Review execution logs for:
   - Success rate
   - Error messages
   - Execution time

### Monitor Audit Logs

Query the audit logs table to verify workflow actions:

```sql
SELECT * FROM public.audit_logs
WHERE table_name = 'resources'
  AND action IN ('auto_publish', 'auto_archive', 'notification_sent')
ORDER BY created_at DESC
LIMIT 100;
```

### Error Alerts

All workflows include error handling that:
- Logs errors to `public.audit_logs`
- Sends email alerts to admins
- Continues execution without crashing

---

## Troubleshooting

### Workflow not triggering

- Check cron schedule syntax
- Verify workflow is **Active** (toggle is ON)
- Check n8n logs for scheduler errors

### Database connection errors

- Verify Supabase credentials are correct
- Check if Supabase project is active
- Test database connection from n8n

### Webhook not receiving requests

- Verify webhook URL is correct
- Check authentication headers
- Review firewall/network settings

### Email notifications not sending

- Verify SMTP credentials
- Check email provider limits (rate limiting)
- Review email logs in n8n

### Users not receiving notifications

- Verify targeting logic in SQL query
- Check user status is `'active'`
- Verify user emails are valid
- Review batch processing logs

---

## Security Considerations

1. **Database Credentials:** Store Supabase credentials securely in n8n credential store
2. **Webhook Authentication:** Always use header authentication for webhooks
3. **API Keys:** Never commit API keys to version control
4. **RLS Policies:** Workflows run with service role, bypassing RLS - ensure queries respect access control
5. **PII Protection:** Never log sensitive user data (emails, names) in audit logs beyond what's necessary
6. **Rate Limiting:** Email batching prevents SMTP rate limit issues

---

## Maintenance

### Regular Tasks

- Review workflow execution logs weekly
- Monitor audit logs for unusual activity
- Update credentials when rotated
- Test workflows after Supabase schema changes

### Schema Changes

If the `resources` table schema changes:
1. Update SQL queries in workflow nodes
2. Test thoroughly in staging environment
3. Update this documentation

---

## Related Documentation

- [Resources / Information Hub Setup](../../docs/sn-management-setup.md#25-resources--information-hub)
- [Announcements Workflows](./announcements-auto-publish.json)
- [n8n Documentation](https://docs.n8n.io/)
- [Supabase Documentation](https://supabase.io/docs)

---

## Support

For issues or questions:
1. Check n8n execution logs
2. Review audit logs in database
3. Verify environment variables
4. Contact DevOps team for infrastructure issues
